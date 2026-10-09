import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { firebase, demoMode } from './firebase.mjs';
import { collections, emptyState } from './domain.mjs';
import { seedState } from './seed.mjs';
const file = path.join(process.cwd(), '.local', 'demo.json');
let queue = Promise.resolve();
async function demoRead() { try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; return seedState(); } }
export async function readState() {
  if (demoMode()) return demoRead();
  const { db } = firebase(); const snapshots = await Promise.all(collections.map(k => db.collection(k).get()));
  return Object.fromEntries(collections.map((k, i) => [k, snapshots[i].docs.map(d => ({ ...d.data(), id: d.id }))]));
}
export async function transaction(fn) {
  if (demoMode()) {
    const task = queue.then(async () => { const state = await demoRead(); const result = await fn(state); await mkdir(path.dirname(file), { recursive: true }); await writeFile(`${file}.tmp`, JSON.stringify(state)); await rename(`${file}.tmp`, file); return result; });
    queue = task.catch(() => {}); return task;
  }
  const { db } = firebase();
  return db.runTransaction(async tx => {
    const s = emptyState(); const originals = {};
    for (const k of collections) { const snap = await tx.get(db.collection(k)); s[k] = snap.docs.map(d => ({ ...d.data(), id: d.id })); originals[k] = new Map(s[k].map(r => [r.id, JSON.stringify(r)])); }
    const result = await fn(s);
    for (const k of collections) for (const r of s[k]) if (originals[k].get(r.id) !== JSON.stringify(r)) tx.set(db.collection(k).doc(r.id), r);
    return result;
  });
}
