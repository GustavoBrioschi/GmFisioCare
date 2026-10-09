import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from '../lib/seed.mjs';
import { mutate, visibleState, pricing, usedSessions, netPaid } from '../lib/domain.mjs';
const admin = { id: 'a', name: 'Admin', role: 'admin' };
const pro = { id: 'p', name: 'Profissional', role: 'professional', professionalId: 'pro0' };
const now = new Date().toISOString(), date = now.slice(0, 10);
const future = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const pkgInput = { patientId: 'pat0', professionalId: 'pro0', specialtyId: 's0', sessions: 3, gross: 10001, discountType: 'amount', discount: 1, expiresAt: future(30), installments: 3, dueDate: date };
const encounter = (pkgId = '') => ({ patientId: 'pat0', professionalId: 'pro0', specialtyId: 's0', packageId: pkgId, date, gross: 15000, discountType: 'amount', discount: 2000, guidance: '', installments: 1, dueDate: date });
test('repasse sobre líquido e conservação dos centavos', () => {
  assert.deepEqual(pricing(15000, 'amount', 2000, 30), { gross: 15000, discountAmount: 2000, net: 13000, clinicPercent: 30, clinicAmount: 3900, professionalAmount: 9100 });
  assert.throws(() => pricing(100, 'percent', 101, 30));
});
test('pacote distribui todos os centavos e impede consumo excedente', () => {
  const s = seedState(); const pkg = mutate(s, pro, 'package', pkgInput, now);
  const es = Array.from({ length: 3 }, () => mutate(s, pro, 'encounter', encounter(pkg.id), now));
  assert.equal(es.reduce((n, e) => n + e.net, 0), 10000);
  assert.equal(s.charges.find(c => c.id === pkg.chargeId).installments.reduce((n, i) => n + i.amount, 0), 10000);
  assert.throws(() => mutate(s, pro, 'encounter', encounter(pkg.id), now), /disponíveis/);
  mutate(s, pro, 'cancelEncounter', { id: es[0].id, reason: 'Correção' });
  assert.equal(usedSessions(s, pkg.id), 2);
  const replacement = mutate(s, pro, 'encounter', encounter(pkg.id), now); assert.equal(replacement.net, es[0].net);
});
test('repasse histórico não muda quando percentual do profissional muda', () => {
  const s = seedState(); const e = mutate(s, pro, 'encounter', encounter(), now);
  s.professionals[0].clinicPercent = 50; assert.equal(e.clinicAmount, 3900);
  assert.equal(mutate(s, pro, 'encounter', encounter(), now).clinicAmount, 6500);
});
test('profissional não consulta paciente não vinculado nem libera acesso para si', () => {
  const s = seedState(); assert(!visibleState(s, pro).patients.some(p => p.id === 'pat1'));
  assert.throws(() => mutate(s, pro, 'link', { patientId: 'pat1', professionalId: 'pro0' }), /liberar/);
  mutate(s, admin, 'link', { patientId: 'pat1', professionalId: 'pro0' });
  const view = visibleState(s, pro); assert(view.patients.some(p => p.id === 'pat1'));
  const shared = view.encounters.find(e => e.patientId === 'pat1');
  for (const key of ['net', 'gross', 'professionalAmount', 'clinicPercent', 'chargeId']) assert.equal(shared[key], undefined);
  assert(!view.charges.some(c => c.patientId === 'pat1'));
});
test('paciente só vê seus registros e não recebe repasses nem auditoria', () => {
  const s = seedState(), patient = { id: 'u', role: 'patient', patientId: 'pat0' }; const view = visibleState(s, patient);
  assert.equal(view.patients.length, 1); assert(view.encounters.every(e => e.patientId === 'pat0' && e.clinicAmount === undefined && e.professionalAmount === undefined));
  assert(view.charges.every(c => c.patientId === 'pat0')); assert.equal(view.audit.length, 0);
  assert.throws(() => mutate(s, patient, 'encounter', encounter()), /consulta/);
});
test('cancelamento de pacote preserva sessões e permite devolução com limite', () => {
  const s = seedState(); const p = mutate(s, admin, 'package', { ...pkgInput, installments: 1 }); const e = mutate(s, admin, 'encounter', encounter(p.id));
  const pay = { chargeId: p.chargeId, installment: 1, amount: 10000, date, method: 'Pix', kind: 'payment', note: '' };
  mutate(s, admin, 'payment', pay); mutate(s, admin, 'cancelPackage', { id: p.id, reason: 'Interrupção' });
  assert.equal(s.charges.find(c => c.id === p.chargeId).amount, e.net); assert.equal(e.cancelled, false);
  assert.throws(() => mutate(s, admin, 'payment', { ...pay, kind: 'refund', amount: 10001, note: 'Devolução' }), /superior/);
  mutate(s, admin, 'payment', { ...pay, kind: 'refund', amount: 10000 - e.net, note: 'Saldo não utilizado' });
  assert.equal(netPaid(s, p.chargeId), e.net); assert(s.audit.at(-1).after);
});
test('não aceita pagamento excedente, pacote vencido ou especialidade incompatível', () => {
  const s = seedState(); const e = mutate(s, pro, 'encounter', encounter());
  assert.throws(() => mutate(s, pro, 'payment', { chargeId: e.chargeId, installment: 1, amount: 13001, date, method: 'Pix', kind: 'payment', note: '' }), /superior/);
  assert.throws(() => mutate(s, pro, 'encounter', { ...encounter(), specialtyId: 's6' }), /Especialidade/);
  const p = mutate(s, pro, 'package', pkgInput); p.expiresAt = '2000-01-01';
  assert.throws(() => mutate(s, pro, 'encounter', encounter(p.id)), /vencido/);
});
