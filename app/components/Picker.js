'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
export const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Picker({ label, value = '', onChange, options = [], required = false, placeholder = 'Selecione', name, disabled = false }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0), [invalid, setInvalid] = useState(false);
  const dialog = useRef(), input = useRef(), trigger = useRef(), id = useId();
  const selected = options.find(o => String(o.value) === String(value));
  const filtered = options.filter(o => normalize(`${o.label} ${o.search || ''} ${o.description || ''}`).includes(normalize(query)));
  const choices = required ? filtered : [{ value: '', label: placeholder }, ...filtered];
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  function choose(option) { onChange({ target: { value: String(option.value), name } }); setInvalid(false); close(); }
  useEffect(() => {
    if (!open) return;
    setQuery(''); setActive(0); dialog.current.showModal(); input.current?.focus();
  }, [open]);
  useEffect(() => { dialog.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);
  return <div className="picker">
    <button type="button" ref={trigger} className={`picker-trigger ${invalid ? 'invalid' : ''}`} role="combobox" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} aria-required={required} disabled={disabled} onClick={() => setOpen(true)}>
      <span className={!selected ? 'muted' : ''}>{selected?.label || placeholder}</span><ChevronDown size={16}/>
    </button>
    {required && <input className="select-validation" aria-hidden="true" tabIndex={-1} required value={selected ? String(value) : ''} onChange={() => {}} onInvalid={e => { e.preventDefault(); setInvalid(true); if (e.currentTarget.form?.querySelector(':invalid') === e.currentTarget) setOpen(true); }}/>}
    {invalid && <small className="field-error">Selecione uma opção.</small>}
    <dialog ref={dialog} id={`${id}-dialog`} aria-labelledby={`${id}-title`} className="picker-dialog" onCancel={e => { e.preventDefault(); e.stopPropagation(); close(); }} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}>
      <header><div><h2 id={`${id}-title`}>{label}</h2><p>Pesquise e selecione uma opção</p></div><button type="button" className="icon-button" aria-label={`Fechar seleção de ${label}`} onClick={close}><X size={21}/></button></header>
      <div className="picker-search"><Search size={19}/><input ref={input} aria-label={`Pesquisar ${label}`} placeholder={name === 'patientId' ? 'Buscar por nome ou CPF' : 'Digite para pesquisar…'} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(0, Math.min(choices.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1)))); }
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (choices[active]) choose(choices[active]); }
      }}/></div>
      <div className="picker-options" role="listbox" aria-label={`Opções de ${label}`}>
        {choices.map((o, i) => <button type="button" key={o.value} role="option" aria-selected={String(value) === String(o.value)} data-active={active === i} onFocus={() => setActive(i)} onClick={() => choose(o)}><span><strong>{o.label}</strong>{o.description && <small>{o.description}</small>}</span>{String(value) === String(o.value) && <Check size={18}/>}</button>)}
        {!choices.length && <p className="empty">Nenhuma opção encontrada.</p>}
      </div><footer>{filtered.length} {filtered.length === 1 ? 'opção encontrada' : 'opções encontradas'}</footer>
    </dialog>
  </div>;
}
