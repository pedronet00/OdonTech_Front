import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Patient } from '../../../domain/models/types';
import { initials, normalizeText } from './agendaUtils';

interface PatientPickerProps {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
}

const MAX_RESULTS = 7;

export function PatientPicker({ patients, value, onChange }: PatientPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = patients.find(p => p.id === value);

  const results = useMemo(() => {
    const text = normalizeText(query.trim());
    const digits = query.replace(/\D/g, '');
    const matches = !text
      ? patients
      : patients.filter(p =>
          normalizeText(p.nome).includes(text) ||
          (digits.length >= 3 && ((p.cpf ?? '').replace(/\D/g, '').includes(digits) || (p.telefone ?? '').replace(/\D/g, '').includes(digits))),
        );
    return [...matches].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, MAX_RESULTS);
  }, [patients, query]);

  const choose = (patient: Patient) => {
    onChange(patient.id);
    setQuery('');
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="ag-patient-chosen">
        <span className="ag-avatar" aria-hidden="true">{initials(selected.nome)}</span>
        <span className="ag-patient-text">
          <strong>{selected.nome}</strong>
          {selected.telefone && <small>{selected.telefone}</small>}
        </span>
        <button type="button" className="ag-link-btn" onClick={() => onChange('')}>Trocar</button>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <p className="ag-hint">
        Nenhum paciente cadastrado ainda. <Link to="/pacientes">Cadastrar paciente</Link>
      </p>
    );
  }

  return (
    <div className="ag-combo">
      <Search size={16} className="ag-combo-icon" aria-hidden="true" />
      <input
        id="ag-patient"
        className="input-field ag-combo-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
        placeholder="Buscar por nome, CPF ou telefone"
        autoComplete="off"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); choose(results[active]); }
          if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
        }}
      />
      {open && (
        <ul className="ag-combo-list" id={listId} role="listbox">
          {results.length === 0 && <li className="ag-combo-empty">Nenhum paciente encontrado para “{query}”.</li>}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${p.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseDown={e => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ag-avatar is-small" aria-hidden="true">{initials(p.nome)}</span>
              <span className="ag-patient-text">
                <strong>{p.nome}</strong>
                {p.telefone && <small>{p.telefone}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
