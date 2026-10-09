import { createHmac, randomBytes } from 'node:crypto';
import { firebase, demoMode } from './firebase.mjs';
import { assert } from './domain.mjs';
const memory = new Map(); const localKey = randomBytes(32);
export async function rateLimit(key, limit = 90, windowMs = 60000) {
  const secret = process.env.RATE_LIMIT_SECRET || (demoMode() ? localKey : null);
  assert(secret, 'Configure RATE_LIMIT_SECRET no servidor.', 503);
  const hash = createHmac('sha256', secret).update(key).digest('hex'); const now = Date.now();
  if (demoMode()) { for (const [k, v] of memory) if (v.reset <= now) memory.delete(k); let r = memory.get(hash); if (!r) memory.set(hash, r = { count: 0, reset: now + windowMs }); assert(++r.count <= limit, 'Muitas tentativas. Aguarde antes de tentar novamente.', 429); return; }
  const { db } = firebase(); const ref = db.collection('_rateLimits').doc(hash);
  await db.runTransaction(async tx => { const snap = await tx.get(ref); const r = snap.data(); const count = r && r.reset > now ? r.count + 1 : 1; assert(count <= limit, 'Muitas tentativas. Aguarde antes de tentar novamente.', 429); tx.set(ref, { count, reset: r && r.reset > now ? r.reset : now + windowMs }); });
}
