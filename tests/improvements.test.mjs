import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../lib/origin.mjs';
import { chargeSummary } from '../lib/finance.mjs';
import { buildDemoCases, appendLocalDemoCases } from '../lib/demo-reports.mjs';
import { seedState } from '../lib/seed.mjs';
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
