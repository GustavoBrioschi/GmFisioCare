export function chargeSummary(charge, payments, today) {
  const rows = payments.filter(p => p.chargeId === charge.id);
  const net = list => list.reduce((n, p) => n + (p.kind === 'refund' ? -p.amount : p.amount), 0);
  const received = net(rows), remaining = Math.max(0, charge.amount - received), refund = Math.max(0, received - charge.amount);
  let available = charge.amount;
  const installments = charge.installments.map(i => {
    const amount = Math.min(i.amount, Math.max(0, available)); available -= amount;
    const received = net(rows.filter(p => p.installment === i.number));
    return { ...i, originalAmount: i.amount, amount, received, balance: Math.max(0, amount - received) };
  });
  const overdue = Math.min(remaining, installments.filter(i => i.dueDate < today).reduce((n, i) => n + i.balance, 0));
  const nextDue = installments.filter(i => i.balance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate;
  return { received, remaining, refund, overdue, nextDue, installments, status: refund ? 'A devolver' : overdue ? 'Atrasado' : remaining ? 'Pendente' : 'Quitado' };
}
