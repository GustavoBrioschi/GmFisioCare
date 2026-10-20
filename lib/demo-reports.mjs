import { pricing } from './domain.mjs';

// Stable IDs allow repeat runs without duplicates. Only original, identifiable
// synthetic patients are eligible. Existing packages and records are untouched.
export function isSyntheticPatient(p) {
  const match = /^pat(\d+)$/.exec(p.id);
  return Boolean(match && Number(match[1]) < 100 && p.cpf === String(10000000000 + Number(match[1])) && p.email === `paciente${Number(match[1])}@example.com`);
}
export function buildDemoCases(state, today) {
  const [year, month, currentDay] = today.split('-').map(Number);
  const cases = [];
  const patients = state.patients.filter(isSyntheticPatient).sort((a, b) => a.id.localeCompare(b.id));
  patients.forEach((p, index) => {
    const pro = state.professionals.find(r => r.active && p.professionalIds.includes(r.id) && r.specialtyIds.some(id => state.specialties.some(s => s.id === id)));
    if (!pro) return;
    const specialtyId = pro.specialtyIds.find(id => state.specialties.some(s => s.id === id));
    for (let offset = -2; offset <= 0; offset++) {
      const anchor = new Date(Date.UTC(year, month - 1 + offset, 1));
      const ym = anchor.toISOString().slice(0, 7);
      const lastDay = offset === 0 ? currentDay : new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
      const day = 1 + (index * 7 + 11) % lastDay;
      const date = `${ym}-${String(day).padStart(2, '0')}`;
      const root = `gm-demo-v2-${ym}-${p.id}`;
      const shared = { patientId: p.id, professionalId: pro.id, demoSource: 'gm-demo-v2', createdAt: `${date}T15:00:00Z` };
      const amounts = pricing(12000 + index % 7 * 2500, 'percent', index % 3 === 0 ? 10 : 0, pro.clinicPercent);
      const cancellation = index % 17 === 0;
      const first = Math.floor(amounts.net / 2), second = amounts.net - first;
      const due2 = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, Math.min(day, new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 2, 0)).getUTCDate()))).toISOString().slice(0, 10);
      const encounter = { ...shared, ...amounts, id: `${root}-enc`, specialtyId, packageId: '', chargeId: `${root}-charge`, date, cancelled: cancellation, guidance: 'Registro fictício para demonstração dos relatórios.', ...(cancellation ? { cancelReason: 'Cancelamento fictício para demonstração' } : {}) };
      const charge = { ...shared, id: `${root}-charge`, amount: cancellation ? 0 : amounts.net, originalAmount: amounts.net, sourceId: encounter.id, label: 'Atendimento avulso · demonstração', installments: [{ number: 1, amount: first, dueDate: date }, { number: 2, amount: second, dueDate: due2 }] };
      const payment = (suffix, amount, installment, kind = 'payment') => ({ ...shared, id: `${root}-${suffix}`, chargeId: charge.id, installment, amount, date, kind, method: ['Pix', 'Cartão', 'Dinheiro'][index % 3], note: kind === 'refund' ? 'Devolução fictícia após cancelamento' : 'Movimentação fictícia para demonstração' });
      const payments = cancellation ? [payment('pay1', first, 1), ...(index % 34 === 0 ? [payment('refund1', first, 1, 'refund')] : [])] : index % 3 === 0 ? [payment('pay1', first, 1), payment('pay2', second, 2)] : index % 3 === 1 ? [payment('pay1', Math.floor(first / 2), 1)] : [];
      cases.push({ id: root, patient: p, professional: pro, records: [{ collection: 'encounters', data: encounter }, { collection: 'charges', data: charge }, ...payments.map(data => ({ collection: 'payments', data }))] });
    }
  });
  return cases;
}
export function appendLocalDemoCases(state, cases) {
  let added = 0, skipped = 0;
  for (const item of cases) {
    if (item.records.some(r => state[r.collection].some(existing => existing.id === r.data.id))) { skipped++; continue; }
    for (const r of item.records) state[r.collection].push(r.data);
    added++;
  }
  return { added, skipped };
}
