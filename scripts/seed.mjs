import { firebase } from '../lib/firebase.mjs';
import { seedState } from '../lib/seed.mjs';
import { collections } from '../lib/domain.mjs';
if (!process.argv.includes('--confirm-demo-data')) { console.error('Este comando insere dados fictícios no Firebase configurado. Execute: npm run seed -- --confirm-demo-data'); process.exit(1); }
const { db } = firebase();
for (const key of collections) { const existing = await db.collection(key).limit(1).get(); if (!existing.empty) throw new Error(`A coleção ${key} já contém dados. Nada foi sobrescrito.`); }
const s = seedState(); let batch = db.batch(), count = 0, total = 0;
for (const key of collections) for (const record of s[key]) {
  batch.create(db.collection(key).doc(record.id), record); count++; total++;
  if (count === 400) { await batch.commit(); batch = db.batch(); count = 0; }
}
if (count) await batch.commit();
console.log(`${total} registros fictícios inseridos. As contas de acesso são criadas separadamente pelo administrador.`);
