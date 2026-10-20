import { firebase, demoMode } from '../lib/firebase.mjs';
import { buildDemoCases, appendLocalDemoCases, isSyntheticPatient } from '../lib/demo-reports.mjs';
import { readState, transaction } from '../lib/store.mjs';
const local = process.argv.includes('--local');
const apply = process.argv.includes('--apply');
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
if (!local && demoMode()) throw new Error('Para importar no Firebase, defina DEMO_MODE=false. Para a prévia local use --local.');
if (local && !demoMode()) throw new Error('--local exige DEMO_MODE=true fora de produção.');
const state = await readState();
const cases = buildDemoCases(state, today);
const newCases = cases.filter(c => !c.records.some(r => state[r.collection].some(e => e.id === r.data.id)));
console.log(`Destino: ${local ? 'Demonstração local' : process.env.FIREBASE_PROJECT_ID}`);
console.log(`Período: ${cases[0]?.records[0].data.date.slice(0, 7) || 'sem pacientes elegíveis'} até ${today}.`);
console.log(`${cases.length} atendimentos previstos; ${newCases.length} novos; ${cases.length - newCases.length} já presentes.`);
console.log('Somente pacientes fictícios identificados pelo seed original. Cadastros, pacotes e acessos existentes serão preservados.');
if (!apply) { console.log('Prévia concluída, sem gravações. Acrescente --apply para importar.'); process.exit(0); }
if (!cases.length) throw new Error('Nenhum paciente fictício elegível. Rode o seed inicial apenas em banco vazio, ou confira os cadastros pat0…pat99 já importados.');
if (local) {
  const result = await transaction(s => appendLocalDemoCases(s, cases)); console.log(`Importados: ${result.added}. Já existentes: ${result.skipped}.`);
} else {
  const { db } = firebase(); let added = 0, skipped = 0;
  for (const item of cases) {
    const imported = await db.runTransaction(async tx => {
      const patient = (await tx.get(db.collection('patients').doc(item.patient.id))).data();
      const pro = (await tx.get(db.collection('professionals').doc(item.professional.id))).data();
      if (!patient || !pro || !isSyntheticPatient({ ...patient, id: item.patient.id }) || !patient.professionalIds.includes(item.professional.id) || !pro.active || pro.clinicPercent !== item.professional.clinicPercent || !pro.specialtyIds.includes(item.records[0].data.specialtyId)) throw new Error('Cadastro foi alterado durante a importação. Execute a prévia novamente.');
      const refs = item.records.map(r => db.collection(r.collection).doc(r.data.id));
      const existing = await tx.getAll(...refs);
      if (existing.some(s => s.exists)) return false;
      item.records.forEach((r, i) => tx.create(refs[i], r.data));
      return true;
    });
    if (imported) added++; else skipped++;
  }
  console.log(`Importados: ${added} atendimentos com suas cobranças e movimentações. Já existentes: ${skipped}.`);
}
