import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const collections = ['professionals', 'specialties', 'patients', 'packages', 'encounters', 'charges', 'payments', 'audit'];
export const emptyState = () => Object.fromEntries(collections.map(k => [k, []]));
export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function assert(ok, message, status = 400) { if (!ok) throw new AppError(message, status); }
const text = z.string().trim().min(1).max(250);
const money = z.number().int().min(0).max(100000000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Data inválida');
const id = text;
const optional = z.string().trim().max(250).default('');
const person = { name: text, cpf: z.string().regex(/^\d{11}$/, 'Informe os 11 dígitos do CPF'), phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'), birthDate: date, address: text, email: z.union([z.email(), z.literal('')]).default('') };
const schemas = {
  patient: z.object({ ...person, professionalId: id }),
  professional: z.object({ ...person, crefito: text, clinicPercent: z.number().min(0).max(100), specialtyIds: z.array(id).min(1) }),
  specialty: z.object({ name: text }),
  link: z.object({ patientId: id, professionalId: id }),
  package: z.object({ patientId: id, professionalId: id, specialtyId: id, sessions: z.number().int().min(1).max(100), gross: money.refine(v => v > 0), discountType: z.enum(['amount', 'percent']), discount: z.number().min(0), expiresAt: date, installments: z.number().int().min(1).max(24), dueDate: date }),
  encounter: z.object({ patientId: id, professionalId: id, specialtyId: id, packageId: optional, date, gross: money, discountType: z.enum(['amount', 'percent']), discount: z.number().min(0), guidance: z.string().trim().max(5000).default(''), installments: z.number().int().min(1).max(24).default(1), dueDate: date }),
  payment: z.object({ chargeId: id, installment: z.number().int().min(1), amount: money.refine(v => v > 0), date, method: z.enum(['Pix', 'Dinheiro', 'Cartão', 'Transferência']), kind: z.enum(['payment', 'refund']), note: z.string().trim().max(500).default('') }),
  cancelEncounter: z.object({ id, reason: text }),
  cancelPackage: z.object({ id, reason: text }),
  extendPackage: z.object({ id, expiresAt: date }),
  editEncounter: z.object({ id, date, guidance: z.string().trim().max(5000), reason: text }),
  updatePatient: z.object({ id, ...person }),
  updateProfessional: z.object({ id, ...person, crefito: text, clinicPercent: z.number().min(0).max(100), specialtyIds: z.array(id).min(1), active: z.boolean() })
};
export function pricing(gross, discountType, discount, clinicPercent) {
  const discountAmount = discountType === 'percent' ? Math.round(gross * discount / 100) : Math.round(discount);
  assert(Number.isSafeInteger(gross) && gross >= 0 && discount >= 0 && discountAmount <= gross && (discountType !== 'percent' || discount <= 100), 'Desconto inválido.');
  const net = gross - discountAmount;
  const clinicAmount = Math.round(net * clinicPercent / 100);
  return { gross, discountAmount, net, clinicPercent, clinicAmount, professionalAmount: net - clinicAmount };
}
export const usedSessions = (s, packageId) => s.encounters.filter(e => e.packageId === packageId && !e.cancelled).length;
export const netPaid = (s, chargeId, installment) => s.payments.filter(p => p.chargeId === chargeId && (!installment || p.installment === installment)).reduce((n, p) => n + (p.kind === 'refund' ? -p.amount : p.amount), 0);
const find = (s, key, value) => { const r = s[key].find(r => r.id === value); assert(r, 'Registro não encontrado.', 404); return r; };
export function canPatient(user, patient) { return user.role === 'admin' || user.role === 'professional' && patient.professionalIds.includes(user.professionalId) || user.role === 'patient' && patient.id === user.patientId; }
function own(user, professionalId) { assert(user.role === 'admin' || user.role === 'professional' && user.professionalId === professionalId, 'Sem permissão para este profissional.', 403); }
function treatment(s, user, p) {
  own(user, p.professionalId);
  const prof = find(s, 'professionals', p.professionalId);
  assert(prof.active, 'Profissional desativado.');
  const patient = find(s, 'patients', p.patientId);
  assert(patient.professionalIds.includes(prof.id), 'Vincule o profissional ao paciente antes de registrar o atendimento.', 403);
  assert(prof.specialtyIds.includes(p.specialtyId), 'Especialidade não vinculada ao profissional.');
  return prof;
}
function installments(amount, count, dueDate) {
  const base = Math.floor(amount / count);
  const [y, m, d] = dueDate.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const lastDay = new Date(Date.UTC(y, m + i, 0)).getUTCDate();
    return { number: i + 1, amount: base + (i === count - 1 ? amount % count : 0), dueDate: new Date(Date.UTC(y, m - 1 + i, Math.min(d, lastDay))).toISOString().slice(0, 10) };
  });
}
function addCharge(s, p, amount, sourceId, label) {
  const charge = { id: randomUUID(), patientId: p.patientId, professionalId: p.professionalId, amount, originalAmount: amount, sourceId, label, installments: installments(amount, p.installments, p.dueDate) };
  s.charges.push(charge); return charge.id;
}
export function mutate(s, user, action, input, now = new Date().toISOString()) {
  assert(user.role !== 'patient', 'Acesso somente para consulta.', 403);
  if (user.professionalId && user.role === 'professional') assert(find(s, 'professionals', user.professionalId).active, 'Profissional desativado.', 403);
  assert(schemas[action], 'Operação desconhecida.');
  const parsed = schemas[action].safeParse(input);
  assert(parsed.success, parsed.success ? '' : parsed.error.issues[0].message);
  const p = parsed.data;
  const localToday = new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  if (p.birthDate) assert(p.birthDate <= localToday, 'Data de nascimento não pode estar no futuro.');
  let record; let before = null;
  if (action === 'patient') {
    own(user, p.professionalId); find(s, 'professionals', p.professionalId);
    assert(!s.patients.some(r => r.cpf === p.cpf), 'CPF já cadastrado. Solicite o vínculo a um administrador.');
    record = { ...p, id: randomUUID(), professionalIds: [p.professionalId], createdAt: now }; delete record.professionalId; s.patients.push(record);
  } else if (action === 'professional') {
    assert(user.role === 'admin', 'Somente o administrador cadastra profissionais.', 403);
    assert(!s.professionals.some(r => r.cpf === p.cpf), 'CPF já cadastrado.');
    p.specialtyIds.forEach(v => find(s, 'specialties', v));
    record = { ...p, id: randomUUID(), active: true }; s.professionals.push(record);
  } else if (action === 'specialty') {
    assert(!s.specialties.some(r => r.name.toLowerCase() === p.name.toLowerCase()), 'Especialidade já cadastrada.');
    record = { ...p, id: randomUUID() }; s.specialties.push(record);
    if (user.role === 'professional') find(s, 'professionals', user.professionalId).specialtyIds.push(record.id);
  } else if (action === 'link') {
    record = find(s, 'patients', p.patientId);
    assert(canPatient(user, record), 'Você não pode liberar acesso a este paciente.', 403);
    assert(find(s, 'professionals', p.professionalId).active, 'Profissional desativado.');
    before = structuredClone(record);
    record.professionalIds = [...new Set([...record.professionalIds, p.professionalId])];
  } else if (action === 'package') {
    treatment(s, user, p);
    assert(p.expiresAt >= localToday, 'A validade deve ser hoje ou uma data futura.');
    const price = pricing(p.gross, p.discountType, p.discount, 0);
    record = { ...p, ...price, id: randomUUID(), createdAt: now, cancelled: false };
    record.chargeId = addCharge(s, p, price.net, record.id, `Pacote de ${p.sessions} sessões`); s.packages.push(record);
  } else if (action === 'encounter') {
    const prof = treatment(s, user, p);
    assert(p.date <= localToday, 'Registre apenas atendimentos já realizados.');
    record = { ...p, id: randomUUID(), createdAt: now, cancelled: false };
    if (p.packageId) {
      const pkg = find(s, 'packages', p.packageId);
      assert(!pkg.cancelled && pkg.expiresAt >= localToday, 'Pacote cancelado ou vencido. Prorrogue a validade antes de usar.');
      assert(pkg.patientId === p.patientId && pkg.professionalId === p.professionalId && pkg.specialtyId === p.specialtyId, 'Pacote incompatível com o atendimento.');
      const used = usedSessions(s, pkg.id); assert(used < pkg.sessions, 'O pacote não possui sessões disponíveis.');
      // Allocate cents by free slot; cancellation releases that same slot.
      const occupied = new Set(s.encounters.filter(e => e.packageId === pkg.id && !e.cancelled).map(e => e.slot));
      const slot = Array.from({ length: pkg.sessions }, (_, i) => i).find(i => !occupied.has(i));
      const portion = total => Math.floor(total / pkg.sessions) + (slot < total % pkg.sessions ? 1 : 0);
      const net = portion(pkg.net); const gross = portion(pkg.gross);
      Object.assign(record, pricing(gross, 'amount', gross - net, prof.clinicPercent), { slot, chargeId: pkg.chargeId });
    } else {
      Object.assign(record, pricing(p.gross, p.discountType, p.discount, prof.clinicPercent));
      assert(record.net > 0, 'O atendimento avulso precisa ter valor positivo.');
      record.chargeId = addCharge(s, p, record.net, record.id, 'Atendimento avulso');
    }
    s.encounters.push(record);
  } else if (action === 'payment') {
    const charge = find(s, 'charges', p.chargeId); own(user, charge.professionalId);
    assert(p.date <= localToday, 'O pagamento não pode estar no futuro.');
    const part = charge.installments.find(i => i.number === p.installment); assert(part, 'Parcela inválida.');
    const paid = netPaid(s, charge.id); const partPaid = netPaid(s, charge.id, p.installment);
    if (p.kind === 'payment') assert(p.amount <= charge.amount - paid && p.amount <= part.amount - partPaid, 'Valor superior ao saldo pendente.');
    else { assert(p.amount <= paid && p.amount <= partPaid, 'Devolução superior ao valor recebido nessa parcela.'); assert(p.note.length > 0, 'Informe o motivo da devolução.'); }
    record = { ...p, id: randomUUID(), createdAt: now, patientId: charge.patientId, professionalId: charge.professionalId }; s.payments.push(record);
  } else if (['cancelEncounter', 'editEncounter'].includes(action)) {
    record = find(s, 'encounters', p.id); own(user, record.professionalId); assert(!record.cancelled, 'Atendimento já cancelado.'); before = structuredClone(record);
    if (action === 'cancelEncounter') {
      assert(!record.packageId || !find(s, 'packages', record.packageId).cancelled, 'O pacote já foi encerrado. Preserve as sessões realizadas.');
      record.cancelled = true; record.cancelReason = p.reason;
      if (!record.packageId) find(s, 'charges', record.chargeId).amount = 0;
    } else { assert(p.date <= localToday, 'Data futura não permitida.'); record.date = p.date; record.guidance = p.guidance; }
  } else if (['cancelPackage', 'extendPackage'].includes(action)) {
    record = find(s, 'packages', p.id); own(user, record.professionalId); assert(!record.cancelled, 'Pacote já cancelado.'); before = structuredClone(record);
    if (action === 'cancelPackage') {
      record.cancelled = true; record.cancelReason = p.reason;
      find(s, 'charges', record.chargeId).amount = s.encounters.filter(e => e.packageId === record.id && !e.cancelled).reduce((n, e) => n + e.net, 0);
    } else { assert(p.expiresAt > record.expiresAt && p.expiresAt >= localToday, 'A nova validade deve ser posterior à atual.'); record.expiresAt = p.expiresAt; }
  } else if (action === 'updatePatient') {
    record = find(s, 'patients', p.id); assert(canPatient(user, record), 'Paciente não vinculado.', 403);
    assert(!s.patients.some(r => r.id !== p.id && r.cpf === p.cpf), 'CPF já cadastrado.'); before = structuredClone(record); Object.assign(record, p);
  } else if (action === 'updateProfessional') {
    assert(user.role === 'admin', 'Somente administrador pode alterar profissionais e repasses.', 403);
    record = find(s, 'professionals', p.id); assert(!s.professionals.some(r => r.id !== p.id && r.cpf === p.cpf), 'CPF já cadastrado.');
    p.specialtyIds.forEach(v => find(s, 'specialties', v)); before = structuredClone(record); Object.assign(record, p);
  }
  s.audit.push({ id: randomUUID(), at: now, actorId: user.id, actorName: user.name, action, recordId: record.id, reason: p.reason || p.note || '', before, after: structuredClone(record) });
  return record;
}
export function visibleState(s, user) {
  const admin = user.role === 'admin'; const patient = user.role === 'patient';
  const patients = s.patients.filter(p => canPatient(user, p)); const ids = new Set(patients.map(p => p.id));
  const financial = r => admin || (patient ? r.patientId === user.patientId : r.professionalId === user.professionalId);
  const clinical = e => ({ id: e.id, patientId: e.patientId, professionalId: e.professionalId, specialtyId: e.specialtyId, packageId: e.packageId, date: e.date, guidance: e.guidance, cancelled: e.cancelled });
  const encounters = s.encounters.filter(e => ids.has(e.patientId)).map(e => {
    if (!financial(e)) return clinical(e);
    if (patient) return { ...clinical(e), gross: e.gross, discountAmount: e.discountAmount, net: e.net };
    return e;
  });
  return {
    patients, specialties: s.specialties,
    professionals: s.professionals.map(p => admin || p.id === user.professionalId ? p : { id: p.id, name: p.name, specialtyIds: p.specialtyIds, active: p.active }),
    encounters,
    packages: s.packages.filter(financial).map(p => patient ? Object.fromEntries(Object.entries(p).filter(([k]) => !['clinicPercent', 'clinicAmount', 'professionalAmount'].includes(k))) : p),
    charges: s.charges.filter(financial), payments: s.payments.filter(financial),
    audit: admin ? s.audit.slice(-100).reverse() : []
  };
}
