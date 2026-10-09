import { randomBytes, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { firebase, demoMode } from './firebase.mjs';
import { assert } from './domain.mjs';
const demoSecret = randomBytes(32);
const demoProfiles = [
  { id: 'demo-admin', name: 'Gustavo Martins', role: 'admin', professionalId: 'pro1', email: 'admin@demo.local', active: true },
  { id: 'demo-pro', name: 'Mariana Costa', role: 'professional', professionalId: 'pro0', email: 'profissional@demo.local', active: true },
  { id: 'demo-patient', name: 'Ana Silva', role: 'patient', patientId: 'pat0', email: 'paciente@demo.local', active: true }
];
const demoAccounts = new Map(demoProfiles.map(p => [p.id, { ...p, passwordHash: scryptSync('Demo@2026!', p.id, 64).toString('hex'), version: 0 }]));
const session = p => { const body = Buffer.from(JSON.stringify({ id: p.id, version: p.version, exp: Date.now() + 8 * 3600000 })).toString('base64url'); return `${body}.${createHmac('sha256', demoSecret).update(body).digest('base64url')}`; };
export const publicProfile = p => Object.fromEntries(Object.entries(p).filter(([k]) => !['passwordHash', 'version'].includes(k)));
export async function profile(id) { return demoMode() ? demoAccounts.get(id) : (await firebase().db.collection('users').doc(id).get()).data(); }
export async function authenticate(cookie) {
  assert(cookie, 'Entre para continuar.', 401);
  let uid;
  try {
    if (demoMode()) { const [body, sig] = cookie.split('.'); const expected = createHmac('sha256', demoSecret).update(body).digest('base64url'); assert(sig?.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)), 'Sessão inválida.', 401); const token = JSON.parse(Buffer.from(body, 'base64url')); const p = demoAccounts.get(token.id); assert(token.exp > Date.now() && p && token.version === p.version, 'Sessão expirada.', 401); uid = token.id; }
    else uid = (await firebase().auth.verifySessionCookie(cookie, true)).uid;
  } catch { assert(false, 'Sessão expirada. Entre novamente.', 401); }
  const p = await profile(uid); assert(p?.active, 'Acesso desativado.', 403);
  if (p.professionalId && !demoMode()) { const professional = await firebase().db.collection('professionals').doc(p.professionalId).get(); assert(professional.data()?.active, 'Profissional desativado.', 403); }
  return publicProfile({ ...p, id: uid });
}
async function firebaseLogin(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert(response.ok, 'E-mail ou senha incorretos.', 401); return response.json();
}
export async function login(email, password) {
  let p; let cookie;
  if (demoMode()) { p = [...demoAccounts.values()].find(p => p.email.toLowerCase() === email.toLowerCase()); assert(p && timingSafeEqual(Buffer.from(p.passwordHash, 'hex'), scryptSync(password, p.id, 64)), 'E-mail ou senha incorretos.', 401); cookie = session(p); }
  else { const result = await firebaseLogin(email, password); p = { ...await profile(result.localId), id: result.localId }; cookie = await firebase().auth.createSessionCookie(result.idToken, { expiresIn: 8 * 3600000 }); }
  assert(p?.active, 'Acesso desativado.', 403); return { user: publicProfile(p), cookie };
}
export async function changePassword(user, oldPassword, newPassword) {
  assert(newPassword.length >= 10 && newPassword.length <= 128 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword), 'Use pelo menos 10 caracteres, com letras e números.');
  assert(newPassword !== oldPassword, 'Escolha uma senha diferente da temporária.');
  await login(user.email, oldPassword);
  if (demoMode()) { const p = demoAccounts.get(user.id); p.passwordHash = scryptSync(newPassword, p.id, 64).toString('hex'); p.mustChangePassword = false; p.version++; return session(p); }
  const { auth, db } = firebase(); await auth.updateUser(user.id, { password: newPassword });
  await auth.revokeRefreshTokens(user.id); await db.collection('users').doc(user.id).update({ mustChangePassword: false });
  // Re-login on the next request to avoid same-second revocation ambiguity.
  return null;
}
export async function provisionAccount(person, role, actor) {
  assert(person.email, 'Cadastre um e-mail para criar o acesso.');
  const password = `${randomBytes(12).toString('base64url')}7a!`;
  if (demoMode()) {
    let p = [...demoAccounts.values()].find(p => role === 'patient' ? p.patientId === person.id : p.professionalId === person.id);
    assert(![...demoAccounts.values()].some(a => a.email === person.email && a.id !== p?.id), 'E-mail já utilizado por outra conta.');
    if (!p) { p = { id: `demo-${person.id}`, role, active: true, version: 0, [role === 'patient' ? 'patientId' : 'professionalId']: person.id }; demoAccounts.set(p.id, p); }
    Object.assign(p, { email: person.email, name: person.name, passwordHash: scryptSync(password, p.id, 64).toString('hex'), mustChangePassword: true, version: p.version + 1 });
  } else {
    const { db, auth } = firebase(); const key = role === 'patient' ? 'patientId' : 'professionalId';
    const existing = await db.collection('users').where(key, '==', person.id).limit(1).get();
    let uid;
    if (!existing.empty) { uid = existing.docs[0].id; await auth.updateUser(uid, { email: person.email, password }); await auth.revokeRefreshTokens(uid); }
    else { uid = (await auth.createUser({ email: person.email, password, displayName: person.name })).uid; }
    await db.collection('users').doc(uid).set({ id: uid, name: person.name, email: person.email, role: existing.docs[0]?.data().role || role, [key]: person.id, active: true, mustChangePassword: true }, { merge: true });
    await db.collection('audit').add({ id: randomBytes(12).toString('hex'), at: new Date().toISOString(), actorId: actor.id, actorName: actor.name, action: 'accountPasswordReset', recordId: person.id, reason: 'Senha temporária gerada. Nenhuma senha é armazenada no histórico.' });
  }
  return { email: person.email, password };
}
