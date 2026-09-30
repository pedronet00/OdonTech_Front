import { useState } from 'react';
import { format, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Check, CirclePlay, Clock, FileText, Stethoscope, TriangleAlert, X } from 'lucide-react';
import type { Agendamento, Patient, Profissional } from '../../../domain/models/types';
import { PatientPicker } from './PatientPicker';
import {
  appointmentSpan, formatDuration, fromHHmm, minutesOfDay, statusKey, statusLabel, toHHmm,
} from './agendaUtils';

export type ConflictFinder = (profissionalId: string, date: string, startMin: number, duration: number, ignoreId?: string) => Agendamento | null;

const DURATIONS = [30, 60, 90, 120];
const TIME_OPTIONS = Array.from({ length: (22 - 6) * 4 }, (_, i) => 6 * 60 + i * 15);

function PanelHeader({ title, onClose, children }: { title: string; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="ag-panel-head">
      <div className="ag-panel-head-text">
        {children}
        <h2 className="ag-panel-title">{title}</h2>
      </div>
      <button type="button" className="ag-icon-btn" onClick={onClose} aria-label="Fechar painel">
        <X size={18} />
      </button>
    </div>
  );
}

function TimeSelect({ id, date, now, value, onChange }: { id: string; date: string; now: Date; value: string; onChange: (v: string) => void }) {
  const today = format(now, 'yyyy-MM-dd');
  const nowMin = minutesOfDay(now);
  const options = TIME_OPTIONS.map(toHHmm);
  if (value && !options.includes(value)) options.push(value);
  options.sort();

  return (
    <select id={id} className="input-field" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(t => {
        const past = date < today || (date === today && fromHHmm(t) < nowMin);
        return <option key={t} value={t} disabled={past}>{t}</option>;
      })}
    </select>
  );
}

function ConflictNote({ conflict }: { conflict: Agendamento | null }) {
  if (!conflict) return null;
  const { startMin, endMin } = appointmentSpan(conflict);
  return (
    <p className="ag-warning" role="status">
      <TriangleAlert size={16} aria-hidden="true" />
      <span>{conflict.nomeProfissional} já atende {conflict.nomePaciente} das {toHHmm(startMin)} às {toHHmm(endMin)}. Você ainda pode agendar um encaixe.</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */

export interface NewAppointmentForm {
  pacienteId: string;
  profissionalId: string;
  time: string;
  duration: number;
  observacao: string;
}

interface NewAppointmentPanelProps {
  date: Date;
  now: Date;
  form: NewAppointmentForm;
  patients: Patient[];
  professionals: Profissional[];
  saving: boolean;
  findConflict: ConflictFinder;
  onDateChange: (date: Date) => void;
  onChange: (patch: Partial<NewAppointmentForm>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function NewAppointmentPanel({
  date, now, form, patients, professionals, saving, findConflict, onDateChange, onChange, onSubmit, onClose,
}: NewAppointmentPanelProps) {
  const dateValue = format(date, 'yyyy-MM-dd');
  const startMin = form.time ? fromHHmm(form.time) : null;
  const conflict = form.profissionalId && startMin !== null
    ? findConflict(form.profissionalId, dateValue, startMin, form.duration)
    : null;
  const isPast = startMin !== null && dateValue <= format(now, 'yyyy-MM-dd') &&
    (dateValue < format(now, 'yyyy-MM-dd') || startMin < minutesOfDay(now));

  return (
    <form
      className="ag-panel-body"
      onSubmit={e => { e.preventDefault(); onSubmit(); }}
    >
      <PanelHeader title="Novo agendamento" onClose={onClose}>
        <p className="ag-panel-kicker">{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </PanelHeader>

      <div className="ag-panel-scroll">
        <div className="ag-field">
          <label className="input-label" htmlFor="ag-patient">Paciente</label>
          <PatientPicker patients={patients} value={form.pacienteId} onChange={pacienteId => onChange({ pacienteId })} />
        </div>

        <div className="ag-field">
          <label className="input-label" htmlFor="ag-prof">Profissional</label>
          <select id="ag-prof" className="input-field" value={form.profissionalId} onChange={e => onChange({ profissionalId: e.target.value })}>
            <option value="">Selecione o profissional</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <div className="ag-field-row">
          <div className="ag-field">
            <label className="input-label" htmlFor="ag-date">Data</label>
            <input
              id="ag-date"
              type="date"
              className="input-field"
              min={format(now, 'yyyy-MM-dd')}
              value={dateValue}
              onChange={e => e.target.value && onDateChange(parseISO(e.target.value))}
            />
          </div>
          <div className="ag-field">
            <label className="input-label" htmlFor="ag-time">Horário</label>
            <TimeSelect id="ag-time" date={dateValue} now={now} value={form.time} onChange={time => onChange({ time })} />
          </div>
        </div>

        <fieldset className="ag-field">
          <legend className="input-label">Duração</legend>
          <div className="ag-segmented">
            {DURATIONS.map(d => (
              <label key={d} className={form.duration === d ? 'is-on' : ''}>
                <input type="radio" name="ag-duration" value={d} checked={form.duration === d} onChange={() => onChange({ duration: d })} />
                {formatDuration(d)}
              </label>
            ))}
          </div>
          {startMin !== null && <p className="ag-hint">Termina às {toHHmm(startMin + form.duration)}.</p>}
        </fieldset>

        <div className="ag-field">
          <label className="input-label" htmlFor="ag-obs">Observação <span className="ag-optional">(opcional)</span></label>
          <textarea
            id="ag-obs"
            className="input-field ag-textarea"
            rows={2}
            maxLength={500}
            placeholder="Ex.: avaliação, retorno de canal, limpeza"
            value={form.observacao}
            onChange={e => onChange({ observacao: e.target.value })}
          />
        </div>

        {isPast && <p className="ag-warning is-danger" role="status"><TriangleAlert size={16} aria-hidden="true" /><span>Esse horário já passou. Escolha outro horário.</span></p>}
        <ConflictNote conflict={conflict} />
      </div>

      <div className="ag-panel-foot">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Descartar</button>
        <button type="submit" className="btn btn-primary" disabled={saving || isPast || !form.pacienteId || !form.profissionalId || !form.time}>
          {saving ? 'Agendando…' : 'Agendar consulta'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

interface AppointmentDetailPanelProps {
  appointment: Agendamento;
  now: Date;
  busy: boolean;
  findConflict: ConflictFinder;
  onConfirm: () => void;
  onStart: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onReschedule: (date: string, time: string) => void;
  onBookAgain: () => void;
  onOpenRecord: () => void;
  onClose: () => void;
}

const STEPS = ['A confirmar', 'Confirmado', 'Em atendimento', 'Atendido'];
const STEP_OF: Partial<Record<ReturnType<typeof statusKey>, number>> = { agendado: 0, confirmado: 1, ematendimento: 2, realizado: 3 };

export function AppointmentDetailPanel({
  appointment: a, now, busy, findConflict, onConfirm, onStart, onNoShow, onCancel, onReschedule, onBookAgain, onOpenRecord, onClose,
}: AppointmentDetailPanelProps) {
  const start = parseISO(a.dataHoraInicio);
  const { startMin, endMin, duration } = appointmentSpan(a);
  const key = statusKey(a.status);
  const isOpen = key === 'agendado' || key === 'confirmado';
  const hasStarted = !isBefore(now, start);

  const [pending, setPending] = useState<'falta' | 'cancelar' | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(format(start, 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState(toHHmm(startMin));

  const stepIndex = STEP_OF[key] ?? -1;
  const lastStep = STEPS.length - 1;
  const rescheduleConflict = rescheduling ? findConflict(a.profissionalId, newDate, fromHHmm(newTime), duration, a.id) : null;

  return (
    <div className="ag-panel-body">
      <PanelHeader title={a.nomePaciente} onClose={onClose}>
        <span className={`ag-pill st-${key}`}>{statusLabel(a.status)}</span>
      </PanelHeader>

      <div className="ag-panel-scroll">
        <ul className="ag-facts">
          <li><CalendarDays size={16} aria-hidden="true" /><span className="ag-cap">{format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}</span></li>
          <li><Clock size={16} aria-hidden="true" /><span>{toHHmm(startMin)} às {toHHmm(endMin)} <span className="ag-muted">({formatDuration(duration)})</span></span></li>
          <li><Stethoscope size={16} aria-hidden="true" /><span>{a.nomeProfissional}</span></li>
        </ul>

        {a.observacao && <p className="ag-note">{a.observacao}</p>}

        {stepIndex >= 0 ? (
          <ol className="ag-steps" aria-label="Andamento da consulta">
            {STEPS.map((label, i) => (
              <li key={label} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
                <span className="ag-step-dot">{i < stepIndex || (i === lastStep && stepIndex === lastStep) ? <Check size={12} /> : null}</span>
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <p className={`ag-warning ${key === 'cancelado' ? 'is-muted' : ''}`}>
            <TriangleAlert size={16} aria-hidden="true" />
            <span>{key === 'falta' ? 'O paciente não compareceu a esta consulta.' : key === 'cancelado' ? 'Esta consulta foi cancelada e o horário está livre.' : `Situação: ${a.status}.`}</span>
          </p>
        )}

        {rescheduling && (
          <div className="ag-subform">
            <p className="ag-subform-title">Novo horário</p>
            <div className="ag-field-row">
              <div className="ag-field">
                <label className="input-label" htmlFor="ag-rs-date">Data</label>
                <input id="ag-rs-date" type="date" className="input-field" min={format(now, 'yyyy-MM-dd')} value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div className="ag-field">
                <label className="input-label" htmlFor="ag-rs-time">Horário</label>
                <TimeSelect id="ag-rs-time" date={newDate} now={now} value={newTime} onChange={setNewTime} />
              </div>
            </div>
            <ConflictNote conflict={rescheduleConflict} />
            <div className="ag-inline-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRescheduling(false)}>Voltar</button>
              <button type="button" className="btn btn-primary" disabled={busy || !newDate || !newTime} onClick={() => onReschedule(newDate, newTime)}>
                {busy ? 'Salvando…' : 'Salvar novo horário'}
              </button>
            </div>
          </div>
        )}

        {pending && (
          <div className="ag-subform is-danger" role="alertdialog" aria-label="Confirmar ação">
            <p>
              {pending === 'cancelar'
                ? <>Cancelar a consulta de <strong>{a.nomePaciente}</strong>? O horário ficará livre para outro paciente.</>
                : <>Registrar que <strong>{a.nomePaciente}</strong> não compareceu?</>}
            </p>
            <div className="ag-inline-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>Manter consulta</button>
              <button
                type="button"
                className="btn ag-btn-danger"
                disabled={busy}
                onClick={() => { (pending === 'cancelar' ? onCancel : onNoShow)(); setPending(null); }}
              >
                {pending === 'cancelar' ? 'Sim, cancelar' : 'Sim, registrar falta'}
              </button>
            </div>
          </div>
        )}
      </div>

      {!rescheduling && !pending && (
        <div className="ag-panel-foot is-stacked">
          {key === 'agendado' && (
            <button type="button" className="btn btn-primary ag-btn-lg" onClick={onConfirm} disabled={busy}>
              <Check size={18} /> Confirmar presença
            </button>
          )}
          {key === 'confirmado' && (
            <button type="button" className="btn btn-primary ag-btn-lg" onClick={onStart} disabled={busy}>
              <CirclePlay size={18} /> {busy ? 'Iniciando…' : 'Iniciar atendimento'}
            </button>
          )}
          {key === 'falta' && (
            <button type="button" className="btn btn-primary ag-btn-lg" onClick={() => setRescheduling(true)}>
              <CalendarDays size={18} /> Reagendar consulta
            </button>
          )}
          {key === 'cancelado' && (
            <button type="button" className="btn btn-primary ag-btn-lg" onClick={onBookAgain}>
              <CalendarDays size={18} /> Agendar novamente
            </button>
          )}

          <div className="ag-foot-row">
            {isOpen && <button type="button" className="btn btn-secondary" onClick={() => setRescheduling(true)}>Reagendar</button>}
            {key === 'ematendimento' ? (
              <button type="button" className="btn btn-primary ag-btn-lg" onClick={onOpenRecord}>
                <CirclePlay size={18} /> Continuar atendimento
              </button>
            ) : (
              <button type="button" className={`btn ${key === 'realizado' ? 'btn-primary ag-btn-lg' : 'btn-secondary'}`} onClick={onOpenRecord}>
                <FileText size={16} /> Prontuário
              </button>
            )}
          </div>

          {isOpen && (
            <div className="ag-foot-quiet">
              {hasStarted && <button type="button" className="ag-link-btn" onClick={() => setPending('falta')}>Registrar falta</button>}
              <button type="button" className="ag-link-btn is-danger" onClick={() => setPending('cancelar')}>Cancelar consulta</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
