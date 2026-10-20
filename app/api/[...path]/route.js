import { NextResponse } from 'next/server';
import { authenticate, login, changePassword, provisionAccount } from '../../../lib/auth.mjs';
import { demoMode } from '../../../lib/firebase.mjs';
import { readState, transaction } from '../../../lib/store.mjs';
import { assert, mutate, visibleState, canPatient } from '../../../lib/domain.mjs';
import { rateLimit } from '../../../lib/rate-limit.mjs';
import { isAllowedOrigin } from '../../../lib/origin.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private' } });
function setCookie(res, cookie) { res.cookies.set('gm_session', cookie || '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: cookie ? 8 * 3600 : 0 }); return res; }
async function handler(req, context) {
  try {
    const { path } = await context.params; const action = path.join('/');
    if (req.method === 'GET' && action === 'config') return reply({ demo: demoMode() });
    if (req.method !== 'GET') {
      assert(isAllowedOrigin(req, { vercel: Boolean(process.env.VERCEL) }), 'Origem não autorizada. Reabra o site no endereço do servidor.', 403);
      assert(req.headers.get('content-type')?.includes('application/json'), 'Formato inválido.', 415);
    }
    const raw = req.method === 'GET' ? '' : await req.text(); assert(raw.length <= 20000, 'Requisição muito grande.', 413);
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { assert(false, 'JSON inválido.'); }
    if (action === 'login' && req.method === 'POST') {
      // Vercel overwrites x-vercel-forwarded-for. Do not trust client x-forwarded-for.
      const ip = process.env.VERCEL ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 'unknown' : 'local';
      await rateLimit(`login:ip:${ip}`, 20, 15 * 60000);
      assert(typeof body.email === 'string' && typeof body.password === 'string' && body.password.length <= 128, 'Informe e-mail e senha.');
      await rateLimit(`login:email:${body.email.toLowerCase()}`, 10, 15 * 60000);
      const result = await login(body.email, body.password); return setCookie(reply({ user: result.user }), result.cookie);
    }
    const user = await authenticate(req.cookies.get('gm_session')?.value);
    await rateLimit(`user:${user.id}`);
    if (action === 'logout' && req.method === 'POST') return setCookie(reply({ ok: true }), null);
    if (action === 'me' && req.method === 'GET') return reply({ user, demo: demoMode() });
    if (action === 'password' && req.method === 'POST') { assert(typeof body.newPassword === 'string', 'Informe a nova senha.'); assert(user.mustChangePassword || typeof body.oldPassword === 'string', 'Informe a senha atual.'); await rateLimit(`password:${user.id}`, 5, 15 * 60000); const cookie = await changePassword(user, body.oldPassword, body.newPassword); return setCookie(reply({ ok: true, loginRequired: !cookie }), cookie); }
    assert(!user.mustChangePassword, 'Troque a senha temporária antes de continuar.', 403);
    if (action === 'state' && req.method === 'GET') {
      const s = await readState();
      if (user.role === 'professional') assert(s.professionals.find(p => p.id === user.professionalId)?.active, 'Profissional desativado.', 403);
      return reply(visibleState(s, user));
    }
    if (action === 'account' && req.method === 'POST') {
      assert(['patient', 'professional'].includes(body.role), 'Perfil inválido.');
      const s = await readState(); const person = s[body.role === 'patient' ? 'patients' : 'professionals'].find(p => p.id === body.id);
      assert(person, 'Cadastro não encontrado.', 404);
      assert(user.role === 'admin' || user.role === 'professional' && body.role === 'patient' && canPatient(user, person), 'Sem permissão.', 403);
      await rateLimit(`provision:${user.id}`, 10, 15 * 60000);
      return reply(await provisionAccount(person, body.role, user));
    }
    if (action === 'mutate' && req.method === 'POST') { await transaction(s => mutate(s, user, body.action, body.data)); return reply({ ok: true }); }
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) { if (!e.status) console.error('API error:', e.code || e.message); return reply({ error: e.status ? e.message : 'Não foi possível concluir. Verifique a configuração do servidor e tente novamente.' }, e.status || 500); }
}
export { handler as GET, handler as POST };
