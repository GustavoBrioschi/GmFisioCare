// Explicitly run against local DEMO_MODE only. Never use real credentials.
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:3000';
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
assert.equal(adminState.patients.length, 100); assert.equal(proState.patients.length, 10); assert.equal(patientState.patients.length, 1);
assert(patientState.encounters.every(e => e.professionalAmount === undefined));
assert.equal((await request('mutate', { action: 'specialty', data: { name: 'Forbidden' } }, patient.cookie)).status, 403);
assert.equal((await request('mutate', { action: 'link', data: { patientId: 'pat1', professionalId: 'pro0' } }, pro.cookie)).status, 403);
assert.equal((await request('logout', {}, admin.cookie, 'https://other.example')).status, 403);
const invitation = await request('account', { id: 'pat99', role: 'patient' }, admin.cookie); assert.equal(invitation.status, 200);
const temporary = await request('login', { email: invitation.data.email, password: invitation.data.password }); assert.equal(temporary.status, 200);
assert.equal((await request('state', undefined, temporary.cookie)).status, 403);
const change = await request('password', { oldPassword: invitation.data.password, newPassword: 'Synthetic-QA-2026-password' }, temporary.cookie); assert.equal(change.status, 200);
assert.equal((await request('state', undefined, temporary.cookie)).status, 401);
const after = await request('state', undefined, change.cookie); assert.equal(after.status, 200); assert.equal(after.data.patients[0].id, 'pat99');
console.log('API smoke: authentication, 3 roles, CSRF, privacy, temporary password gate and session invalidation passed.');
