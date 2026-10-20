// Explicitly run against local DEMO_MODE only. Never use real credentials.
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Use only a local test server.');
async function request(path, body, cookie = '', requestOrigin = origin) {
  const r = await fetch(`${origin}/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: requestOrigin }), Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
assert.equal((await request('config')).data.demo, true, 'This test only supports a local demo.');
assert.equal((await request('state')).status, 401);
const admin = await request('login', { email: 'admin@demo.local', password: 'Demo@2026!' }); assert.equal(admin.status, 200);
const pro = await request('login', { email: 'profissional@demo.local', password: 'Demo@2026!' }); assert.equal(pro.status, 200);
const patient = await request('login', { email: 'paciente@demo.local', password: 'Demo@2026!' }); assert.equal(patient.status, 200);
const adminState = (await request('state', undefined, admin.cookie)).data;
const proState = (await request('state', undefined, pro.cookie)).data;
const patientState = (await request('state', undefined, patient.cookie)).data;
assert(adminState.patients.length >= 100);
assert.deepEqual(proState.patients.map(p => p.id).sort(), adminState.patients.filter(p => p.professionalIds.includes('pro0')).map(p => p.id).sort());
assert.equal(patientState.patients.length, 1); assert.equal(patientState.patients[0].id, 'pat0');
assert(patientState.encounters.every(e => e.professionalAmount === undefined));
assert.equal((await request('mutate', { action: 'specialty', data: { name: 'Forbidden' } }, patient.cookie)).status, 403);
assert.equal((await request('mutate', { action: 'link', data: { patientId: 'pat1', professionalId: 'pro0' } }, pro.cookie)).status, 403);
assert.equal((await request('logout', {}, admin.cookie, 'https://other.example')).status, 403);
const invitation = await request('account', { id: 'pat99', role: 'patient' }, admin.cookie); assert.equal(invitation.status, 200);
const temporary = await request('login', { email: invitation.data.email, password: invitation.data.password }); assert.equal(temporary.status, 200);
assert.equal((await request('state', undefined, temporary.cookie)).status, 403);
assert.equal((await request('password', { newPassword: 'Synthetic-QA-2026-password' })).status, 401);
assert.equal((await request('password', { newPassword: 'short' }, temporary.cookie)).status, 400);
const change = await request('password', { newPassword: 'Synthetic-QA-2026-password' }, temporary.cookie); assert.equal(change.status, 200);
assert.equal((await request('state', undefined, temporary.cookie)).status, 401);
const after = await request('state', undefined, change.cookie); assert.equal(after.status, 200); assert.equal(after.data.patients[0].id, 'pat99');
assert.equal((await request('login', { email: invitation.data.email, password: invitation.data.password })).status, 401);
assert.equal((await request('password', { newPassword: 'Another-QA-2026-password', mustChangePassword: true }, change.cookie)).status, 400);
assert.equal((await request('password', { oldPassword: 'wrong-password', newPassword: 'Another-QA-2026-password' }, change.cookie)).status, 401);
const normalChange = await request('password', { oldPassword: 'Synthetic-QA-2026-password', newPassword: 'Another-QA-2026-password' }, change.cookie); assert.equal(normalChange.status, 200);
assert.equal((await request('state', undefined, change.cookie)).status, 401);
assert.equal((await request('login', { email: invitation.data.email, password: 'Another-QA-2026-password' })).status, 200);
console.log('API smoke: roles, CSRF, privacy, first access without re-entering temporary password, regular password verification and session invalidation passed.');
