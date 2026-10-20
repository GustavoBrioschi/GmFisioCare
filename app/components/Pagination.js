export default function Pagination({ total, page, onChange, size = 30 }) {
  const count = Math.max(1, Math.ceil(total / size)); const current = Math.min(page, count);
  return <nav className="pagination" aria-label="Paginação"><span>{total ? (current - 1) * size + 1 : 0}–{Math.min(current * size, total)} de {total}</span><div><button type="button" className="secondary" disabled={current === 1} onClick={() => onChange(current - 1)}>Anterior</button><span>Página {current} de {count}</span><button type="button" className="secondary" disabled={current === count} onClick={() => onChange(current + 1)}>Próxima</button></div></nav>;
}
