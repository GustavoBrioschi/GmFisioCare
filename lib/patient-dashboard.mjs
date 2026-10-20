import { chargeSummary } from './finance.mjs';

export function patientOverview(data, today) {
  const history = data.encounters.filter(e => e.date <= today).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const completed = history.filter(e => !e.cancelled);
  const packages = data.packages.map(p => {
    const used = completed.filter(e => e.packageId === p.id).length;
    return { ...p, used, remaining: Math.max(0, p.sessions - used) };
  }).filter(p => !p.cancelled && p.expiresAt >= today && p.remaining > 0).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id.localeCompare(b.id));
  const charges = data.charges.map(c => ({ ...c, summary: chargeSummary(c, data.payments, today) }));
  const upcoming = charges.filter(c => c.summary.remaining > 0).flatMap(c => c.summary.installments
    .filter(i => i.balance > 0 && i.dueDate >= today)
    .map(i => ({ ...i, balance: Math.min(i.balance, c.summary.remaining), chargeLabel: c.label })))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    completed: completed.length, last: completed[0], packages,
    remainingSessions: packages.reduce((n, p) => n + p.remaining, 0),
    guidance: completed.filter(e => e.guidance?.trim()).slice(0, 3),
    recent: history.slice(0, 5),
    pending: charges.reduce((n, c) => n + c.summary.remaining, 0),
    overdue: charges.reduce((n, c) => n + c.summary.overdue, 0),
    refund: charges.reduce((n, c) => n + c.summary.refund, 0),
    nextPayment: upcoming[0]
  };
}
