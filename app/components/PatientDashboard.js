'use client';
import { CalendarDays, Check, ChevronRight, ClipboardList, Package, Wallet } from 'lucide-react';
import { patientOverview } from '../../lib/patient-dashboard.mjs';

const date = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);

export default function PatientDashboard({ data, today, navigate, viewEncounter }) {
  const overview = patientOverview(data, today);
  const name = (collection, id) => data[collection].find(r => r.id === id)?.name || 'Não informado';
  return <div className="patient-dashboard">
    <div className="metrics three">
      {[
        { label: 'Sessões realizadas', value: overview.completed, note: 'Em todo o seu histórico', Icon: Check },
        { label: 'Sessões restantes', value: overview.remainingSessions, note: 'Nos seus pacotes ativos e dentro da validade', Icon: Package },
        { label: 'Último atendimento', value: date(overview.last?.date), note: overview.last ? name('professionals', overview.last.professionalId) : 'Você ainda não tem atendimentos realizados.', Icon: CalendarDays }
      ].map(({ label, value, note, Icon }) => <section className="metric" key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{note}</small></section>)}
    </div>
    <div className="patient-home-grid">
      <div>
        <section className="panel">
          <div className="panel-heading"><div><h2>Meus pacotes</h2><p>Acompanhe as sessões do seu pacote</p></div><button className="text-button" onClick={() => navigate('packages')}>Ver todos <ChevronRight size={16}/></button></div>
          <div className="patient-panel-body">
            {overview.packages.slice(0, 3).map(p => <article className="patient-package" key={p.id}>
              <div className="patient-package-title"><h3>{name('specialties', p.specialtyId)}</h3><span className="badge green">Ativo</span></div>
              <p className="muted">{name('professionals', p.professionalId)}</p>
              <div className="progress-label"><strong>{p.used} de {p.sessions} sessões realizadas</strong><span>{p.remaining} restantes</span></div>
              <div className="progress" role="progressbar" aria-label={`Sessões do pacote de ${name('specialties', p.specialtyId)}`} aria-valuemin={0} aria-valuemax={p.sessions} aria-valuenow={Math.min(p.used, p.sessions)}><span style={{ width: `${Math.min(100, p.used / p.sessions * 100)}%` }}/></div>
              <small>Válido até {date(p.expiresAt)}</small>
            </article>)}
            {!overview.packages.length && <p className="patient-empty">Você não tem pacotes ativos com sessões disponíveis. Consulte seus pacotes para ver os anteriores.</p>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Últimas orientações</h2><p>Registradas pelos seus fisioterapeutas</p></div><ClipboardList size={20}/></div>
          <div className="patient-panel-body">
            {overview.guidance.map(e => <article className="patient-guidance" key={e.id}><div><strong>{name('professionals', e.professionalId)}</strong><small>{date(e.date)} · {name('specialties', e.specialtyId)}</small></div><p>{e.guidance}</p><button className="text-button" onClick={() => viewEncounter(e.id)}>Ver orientação completa <ChevronRight size={16}/></button></article>)}
            {!overview.guidance.length && <p className="patient-empty">Quando seu fisioterapeuta registrar orientações em um atendimento, elas aparecerão aqui.</p>}
          </div>
        </section>
      </div>
      <div>
        <section className="panel patient-payment-panel">
          <div className="panel-heading"><div><h2>Meus pagamentos</h2><p>Um resumo do que está em aberto</p></div><Wallet size={21}/></div>
          <div className="patient-panel-body"><span className="muted">Valor em aberto</span><strong className="patient-payment-total">{money(overview.pending)}</strong>
            {overview.pending === 0 ? <p className="patient-payment-ok"><Check size={16}/> Nenhum pagamento pendente.</p> : <p className="hint">Total das parcelas ainda não quitadas.</p>}
            {overview.overdue > 0 && <p className="notice">{money(overview.overdue)} desse valor está em atraso.</p>}
            <div className="patient-next-payment"><small>Próximo vencimento</small>{overview.nextPayment ? <><strong>{date(overview.nextPayment.dueDate)} · {money(overview.nextPayment.balance)}</strong><small>{overview.nextPayment.number}ª parcela · {overview.nextPayment.chargeLabel}</small></> : <p>{overview.pending > 0 ? 'Não há parcelas futuras. Confira as pendências nos detalhes.' : 'Nenhum vencimento em aberto.'}</p>}</div>
            {overview.refund > 0 && <p className="hint">Você tem {money(overview.refund)} a receber em devolução. Consulte a clínica.</p>}
            <button className="secondary wide" onClick={() => navigate('payments')}>Ver meus pagamentos <ChevronRight size={16}/></button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Histórico recente</h2><p>Seus últimos atendimentos</p></div></div>
          <div className="patient-panel-body">{overview.recent.map(e => <button className="patient-history-item" key={e.id} onClick={() => viewEncounter(e.id)} aria-label={`Ver atendimento de ${date(e.date)} com ${name('professionals', e.professionalId)}`}><span><strong>{date(e.date)}</strong><span>{name('specialties', e.specialtyId)}</span><small>{name('professionals', e.professionalId)}</small>{e.cancelled && <span className="badge gray">Cancelado</span>}</span><ChevronRight size={18}/></button>)}{!overview.recent.length && <p className="patient-empty">Seus atendimentos aparecerão aqui assim que forem registrados pela clínica.</p>}<button className="text-button patient-history-link" onClick={() => navigate('encounters')}>Ver histórico completo <ChevronRight size={16}/></button></div>
        </section>
      </div>
    </div>
  </div>;
}
