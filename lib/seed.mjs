import { emptyState, pricing } from './domain.mjs';
export function seedState() {
  const s = emptyState();
  const specs = ['Fisioterapia ortopédica', 'Pilates clínico', 'Fisioterapia neurológica', 'Reabilitação esportiva', 'Fisioterapia respiratória', 'Fisioterapia pélvica', 'Fisioterapia geriátrica', 'Terapia manual'];
  s.specialties = specs.map((name, i) => ({ id: `s${i}`, name }));
  const names = ['Mariana Costa', 'Gustavo Martins', 'Camila Ferreira', 'Rafael Lima', 'Juliana Alves', 'Pedro Ribeiro', 'Larissa Santos', 'Lucas Oliveira', 'Fernanda Rocha', 'Bruno Souza'];
  s.professionals = names.map((name, i) => ({ id: `pro${i}`, name, cpf: String(90000000000 + i), phone: '11999990000', birthDate: '1990-05-15', address: 'Rua das Flores, 120 — São Paulo', email: `profissional${i}@example.com`, crefito: `${120000 + i}-F`, clinicPercent: i % 3 === 0 ? 30 : 25, specialtyIds: [`s${i % 8}`, `s${(i + 1) % 8}`], active: true }));
  const first = ['Ana', 'Carlos', 'Beatriz', 'João', 'Helena', 'Paulo', 'Isabela', 'Marcos', 'Luiza', 'Ricardo'];
  const last = ['Silva', 'Pereira', 'Almeida', 'Costa', 'Nascimento', 'Mendes', 'Cardoso', 'Barbosa', 'Teixeira', 'Moura'];
  s.patients = Array.from({ length: 100 }, (_, i) => ({ id: `pat${i}`, name: `${first[i % 10]} ${last[Math.floor(i / 10)]}`, cpf: String(10000000000 + i), phone: '11988880000', birthDate: `${1960 + i % 45}-06-15`, address: `Rua Jardim, ${i + 20} — São Paulo`, email: `paciente${i}@example.com`, professionalIds: [`pro${i % 10}`], createdAt: new Date().toISOString() }));
  const today = new Date(); const day = offset => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  s.packages = Array.from({ length: 80 }, (_, i) => ({ id: `pkg${i}`, patientId: `pat${i}`, professionalId: `pro${i % 10}`, specialtyId: `s${i % 10 % 8}`, sessions: 10, gross: 150000, discountAmount: 15000, net: 135000, discountType: 'percent', discount: 10, expiresAt: day(45 + i % 30), createdAt: `${day(-60)}T12:00:00Z`, cancelled: false, chargeId: `charge${i}` }));
  s.charges = s.packages.map((p, i) => ({ id: p.chargeId, patientId: p.patientId, professionalId: p.professionalId, amount: p.net, originalAmount: p.net, sourceId: p.id, label: 'Pacote de 10 sessões', installments: Array.from({ length: 3 }, (_, j) => ({ number: j + 1, amount: 45000, dueDate: day(-30 + j * 30 + i % 10) })) }));
  s.encounters = Array.from({ length: 250 }, (_, i) => {
    const pkg = s.packages[i % 80]; const pro = s.professionals[i % 80 % 10];
    return { id: `enc${i}`, patientId: pkg.patientId, professionalId: pro.id, specialtyId: pkg.specialtyId, packageId: pkg.id, chargeId: pkg.chargeId, slot: Math.floor(i / 80), date: day(-Math.floor(i / 5)), ...pricing(15000, 'amount', 1500, pro.clinicPercent), guidance: i % 3 ? '' : 'Mantenha os exercícios orientados durante a sessão. Em caso de dúvidas, converse com seu fisioterapeuta.', cancelled: false, createdAt: `${day(-Math.floor(i / 5))}T12:00:00Z` };
  });
  s.payments = s.charges.flatMap((c, i) => [{ id: `pay${i}`, chargeId: c.id, patientId: c.patientId, professionalId: c.professionalId, installment: 1, amount: 45000, date: day(-30 + i % 10), method: 'Pix', kind: 'payment', note: '', createdAt: new Date().toISOString() }, ...(i % 3 === 0 ? [{ id: `pay-extra${i}`, chargeId: c.id, patientId: c.patientId, professionalId: c.professionalId, installment: 2, amount: 45000, date: day(-i % 8), method: 'Cartão', kind: 'payment', note: '', createdAt: new Date().toISOString() }] : [])]);
  return s;
}
