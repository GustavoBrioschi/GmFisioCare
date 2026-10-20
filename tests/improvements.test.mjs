import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../lib/origin.mjs';
import { chargeSummary } from '../lib/finance.mjs';
import { buildDemoCases, appendLocalDemoCases } from '../lib/demo-reports.mjs';
import { seedState } from '../lib/seed.mjs';
import { patientOverview } from '../lib/patient-dashboard.mjs';

test('resumo do paciente separa sessões realizadas, pacotes válidos e pagamentos', () => {
  const data = {
    encounters: [
      { id: '1', date: '2026-10-10', packageId: 'active', guidance: 'Orientação registrada' },
      { id: '2', date: '2026-10-15', packageId: 'active', guidance: ' ' },
      { id: '3', date: '2026-10-18', packageId: 'active', cancelled: true, guidance: 'Cancelada' },
      { id: '4', date: '2026-11-01', packageId: 'active', guidance: 'Futura' }
    ],
    packages: [
      { id: 'active', sessions: 10, expiresAt: '2026-10-20' },
      { id: 'expired', sessions: 10, expiresAt: '2026-10-19' },
      { id: 'cancelled', sessions: 10, expiresAt: '2026-11-20', cancelled: true }
    ],
    charges: [
      { id: 'c', amount: 10000, installments: [{ number: 1, amount: 5000, dueDate: '2026-10-01' }, { number: 2, amount: 5000, dueDate: '2026-11-01' }] },
      { id: 'refund', amount: 0, installments: [{ number: 1, amount: 2000, dueDate: '2026-10-01' }] }
    ],
    payments: [{ chargeId: 'c', installment: 1, kind: 'payment', amount: 2000 }, { chargeId: 'refund', installment: 1, kind: 'payment', amount: 2000 }]
  };
  const summary = patientOverview(data, '2026-10-20');
  assert.equal(summary.completed, 2); assert.equal(summary.last.id, '2');
  assert.equal(summary.remainingSessions, 8); assert.equal(summary.packages.length, 1);
  assert.deepEqual(summary.guidance.map(e => e.id), ['1']);
  assert.equal(summary.recent.length, 3); assert.equal(summary.recent[0].cancelled, true);
  assert.equal(summary.pending, 8000); assert.equal(summary.overdue, 3000); assert.equal(summary.refund, 2000);
  assert.equal(summary.nextPayment.dueDate, '2026-11-01'); assert.equal(summary.nextPayment.balance, 5000);
});

test('paciente sem registros tem resumo vazio sem próxima sessão ou cobrança inventada', () => {
  const summary = patientOverview({ encounters: [], packages: [], charges: [], payments: [] }, '2026-10-20');
  assert.equal(summary.completed, 0); assert.equal(summary.remainingSessions, 0);
  assert.equal(summary.pending, 0); assert.equal(summary.last, undefined); assert.equal(summary.nextPayment, undefined);
  assert.deepEqual(summary.guidance, []); assert.deepEqual(summary.recent, []);
});
test('origem automática aceita localhost, IP e portas variáveis sem aceitar outros sites', () => {
  const req = (url, origin, headers = {}) => new Request(url, { headers: { origin, ...headers } });
  for (const host of ['localhost:3000', '127.0.0.1:3001', '[::1]:4010']) assert(isAllowedOrigin(req(`http://${host}/api/login`, `http://${host}`)));
  assert(isAllowedOrigin(req('http://127.0.0.1:3000/api/login', 'http://localhost:3000', { host: 'localhost:3000' })));
  assert(isAllowedOrigin(req('http://internal/api/login', 'https://app.vercel.app', { host: 'app.vercel.app', 'x-forwarded-proto': 'https' }), { vercel: true }));
  assert(!isAllowedOrigin(req('https://app.example/api/login', 'https://evil.example')));
  assert(!isAllowedOrigin(req('http://localhost:3001/api/login', 'http://localhost:3000')));
  assert(!isAllowedOrigin(req('http://localhost:3000/api/login', 'http://localhost:3000', { 'sec-fetch-site': 'cross-site' })));
  assert(!isAllowedOrigin(new Request('http://localhost:3000/api/login')));
});
test('financeiro distingue saldo, atraso parcial e devolução sem somar duas vezes', () => {
  const c = { id: 'c', amount: 10000, installments: [{ number: 1, amount: 5000, dueDate: '2026-09-10' }, { number: 2, amount: 5000, dueDate: '2026-11-10' }] };
  const payments = [{ chargeId: 'c', installment: 1, amount: 2000, kind: 'payment' }];
  const s = chargeSummary(c, payments, '2026-10-19'); assert.equal(s.remaining, 8000); assert.equal(s.overdue, 3000); assert.equal(s.status, 'Atrasado');
  const cancelled = chargeSummary({ ...c, amount: 0 }, payments, '2026-10-19'); assert.equal(cancelled.refund, 2000); assert.equal(cancelled.overdue, 0); assert.equal(cancelled.status, 'A devolver');
});
test('importação suplementar é repetível, preserva registros e exclui pacientes manuais', () => {
  const state = seedState(); state.patients.push({ ...state.patients[0], id: 'manual', email: 'real@example.com' });
  const original = structuredClone(state); const cases = buildDemoCases(state, '2026-10-19');
  assert.equal(cases.length, 300); assert.equal(new Set(cases.map(c => c.records[0].data.date.slice(0, 7))).size, 3);
  assert(cases.every(c => c.records[0].data.date <= '2026-10-19' && c.patient.id !== 'manual'));
  assert.equal(appendLocalDemoCases(state, cases).added, 300); assert.equal(appendLocalDemoCases(state, cases).added, 0);
  for (const key of Object.keys(original)) assert.deepEqual(state[key].slice(0, original[key].length), original[key]);
  for (const c of cases) { const enc = c.records[0].data, charge = c.records[1].data; assert.equal(enc.clinicAmount + enc.professionalAmount, enc.net); assert.equal(charge.installments.reduce((n, p) => n + p.amount, 0), charge.originalAmount); }
});
