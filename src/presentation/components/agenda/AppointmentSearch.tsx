import { forwardRef, useEffect, useId, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Search, X } from 'lucide-react';
import ApiClient from '../../../infrastructure/api/apiClient';
import type { Agendamento } from '../../../domain/models/types';
import { appointmentSpan, initials, statusKey, statusLabel, toHHmm } from './agendaUtils';

interface AppointmentSearchProps {
  now: Date;
  onSelect: (appointment: Agendamento) => void;
}

const DEBOUNCE_MS = 350;
const MIN_NAME_LENGTH = 3;

/** O backend trata como CPF qualquer termo só com dígitos e pontuação. */
const isCpfLike = (term: string) => /^[\d.\-\s/]+$/.test(term);

/** Diz por que ainda não dá para pesquisar, ou null quando o termo já é válido. */
function pendingHint(term: string): string | null {
  if (!term) return null;
  if (isCpfLike(term)) {
    const digits = term.replace(/\D/g, '').length;
    return digits < 11 ? `Digite os 11 dígitos do CPF (${digits}/11).` : null;
  }
  return term.length < MIN_NAME_LENGTH ? `Digite pelo menos ${MIN_NAME_LENGTH} letras do nome.` : null;
}

export const AppointmentSearch = forwardRef<HTMLInputElement, AppointmentSearchProps>(function AppointmentSearch({ now, onSelect }, ref) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedTerm, setSearchedTerm] = useState('');

  const term = query.trim();
  const hint = pendingHint(term);
  const canSearch = !!term && !hint;

  useEffect(() => {
    if (!canSearch) return;
    let ignore = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      ApiClient.get<Agendamento[]>(`/agendamentos/pesquisa?termo=${encodeURIComponent(term)}`)
        .then(data => {
          if (ignore) return;
          setResults(data ?? []);
          setSearchedTerm(term);
          setActive(0);
        })
        .catch((err: unknown) => {
          if (ignore) return;
          setResults([]);
          setSearchedTerm(term);
          setError(err instanceof Error && err.message ? err.message : 'Não foi possível pesquisar.');
        })
        .finally(() => { if (!ignore) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { ignore = true; clearTimeout(timer); };
  }, [term, canSearch]);

  // Mostra resultados só quando correspondem ao termo digitado agora.
  const fresh = canSearch && searchedTerm === term;
  const shown = fresh ? results : [];

  const choose = (app: Agendamento) => {
    onSelect(app);
    setOpen(false);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearchedTerm('');
    setError(null);
  };

  const todayKey = format(now, 'yyyy-MM-dd');

  return (
    <div className="ag-combo ag-search">
      <Search size={16} className="ag-combo-icon" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className="input-field ag-combo-input ag-search-input"
        role="combobox"
        aria-label="Pesquisar agendamentos por paciente"
        aria-expanded={open && !!term}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${shown[active].id}` : undefined}
        placeholder="Pesquisar paciente (nome ou CPF)"
        title="Pesquisar paciente (/)"
        autoComplete="off"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, shown.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); choose(shown[active]); }
          if (e.key === 'Escape') {
            e.stopPropagation();
            if (open && term) setOpen(false);
            else { clear(); e.currentTarget.blur(); }
          }
        }}
      />
      {query && (
        <button type="button" className="ag-icon-btn ag-search-clear" onMouseDown={e => e.preventDefault()} onClick={clear} aria-label="Limpar pesquisa">
          {loading ? <Loader2 size={16} className="ag-spin" /> : <X size={16} />}
        </button>
      )}

      {open && term && (
        <ul className="ag-combo-list ag-search-list" id={listId} role="listbox">
          {hint && <li className="ag-combo-empty">{hint}</li>}
          {!hint && !fresh && <li className="ag-combo-empty">Pesquisando…</li>}
          {fresh && error && <li className="ag-combo-empty is-error">{error}</li>}
          {fresh && !error && shown.length === 0 && (
            <li className="ag-combo-empty">Nenhum agendamento encontrado para “{term}”.</li>
          )}
          {shown.map((a, i) => {
            const start = parseISO(a.dataHoraInicio);
            const { startMin, endMin } = appointmentSpan(a);
            const key = statusKey(a.status);
            const newPatient = i === 0 || shown[i - 1].pacienteId !== a.pacienteId;
            return (
              <li key={a.id} role="presentation" className="ag-search-item">
                {newPatient && (
                  <div className="ag-search-patient" aria-hidden="true">
                    <span className="ag-avatar is-small">{initials(a.nomePaciente)}</span>
                    {a.nomePaciente}
                  </div>
                )}
                <div
                  id={`${listId}-${a.id}`}
                  role="option"
                  aria-selected={i === active}
                  aria-label={`${a.nomePaciente}, ${format(start, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} às ${toHHmm(startMin)}, ${statusLabel(a.status)}`}
                  className={`ag-search-row ${i === active ? 'is-active' : ''} ${a.dataHoraInicio.slice(0, 10) < todayKey ? 'is-past' : ''}`}
                  onMouseDown={e => { e.preventDefault(); choose(a); }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="ag-patient-text">
                    <strong className="ag-cap">{format(start, "EEE, d 'de' MMM yyyy", { locale: ptBR })}</strong>
                    <small>{toHHmm(startMin)}–{toHHmm(endMin)} · {a.nomeProfissional}</small>
                  </span>
                  <span className={`ag-pill st-${key}`}>{statusLabel(a.status)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
