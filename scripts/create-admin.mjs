import { randomBytes } from 'node:crypto';
import { firebase } from '../lib/firebase.mjs';
const [email, name = 'Administrador'] = process.argv.slice(2);
if (!email || !email.includes('@')) { console.error('Uso: npm run admin:create -- email@exemplo.com "Nome do administrador"'); process.exit(1); }
const { auth, db } = firebase();
const password = `${randomBytes(15).toString('base64url')}A7!`;
// Creation only; deliberately never promote or reset an existing account.
const user = await auth.createUser({ email, password, displayName: name });
try { await db.collection('users').doc(user.uid).set({ id: user.uid, email, name, role: 'admin', active: true, mustChangePassword: true }); }
catch (e) { await auth.deleteUser(user.uid); throw e; }
console.log(`Administrador criado.\nE-mail: ${email}\nSenha temporária (entrega única): ${password}\nA troca será obrigatória no primeiro acesso.`);
