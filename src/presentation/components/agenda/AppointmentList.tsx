import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Plus } from 'lucide-react';
import type { Agendamento } from '../../../domain/models/types';
import { appointmentSpan, formatDuration, statusKey, statusLabel, toHHmm } from './agendaUtils';

interface AppointmentListProps {
  days: Date[];
  now: Date;
  appointments: Agendamento[];
  loading: boolean;
  activeId: string | null;
  busyId: string | null;
  onOpen: (id: string) => void;
  onConfirm: (app: Agendamento) => void;
  onCreate: (date: Date) => void;
}

export function AppointmentList({ days, now, appointments, loading, activeId, busyId, onOpen, onConfirm, onCreate }: AppointmentListProps) {
  const todayKey = format(now, 'yyyy-MM-dd');

  return (
    <div className={`ag-list ${loading ? 'is-loading' : ''}`}>
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const isPast = key < todayKey;
        const isToday = key === todayKey;
        const apps = appointments
          .filter(a => isSameDay(parseISO(a.dataHoraInicio), day))
          .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));

        return (
          <section key={key} className={`ag-list-day ${isPast ? 'is-past' : ''} ${isToday ? 'is-today' : ''}`} aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}>
            <header className="ag-list-day-head">
              <span className="ag-list-daynum">{format(day, 'd')}</span>
              <span className="ag-list-dayname">
                <span className="ag-cap">{isToday ? 'Hoje' : format(day, 'EEEE', { locale: ptBR })}</span>
                <small>{format(day, "MMMM", { locale: ptBR })}</small>
              </span>
              <span className="ag-list-count">
                {apps.length === 0 ? 'Sem consultas' : apps.length === 1 ? '1 consulta' : `${apps.length} consultas`}
              </span>
              {!isPast && (
                <button type="button" className="ag-icon-btn" onClick={() => onCreate(day)} aria-label={`Novo Agendamento em ${format(day, "d 'de' MMMM", { locale: ptBR })}`} title="Novo Agendamento neste dia">
                  <Plus size={16} />
                </button>
              )}
            </header>

            {apps.length > 0 && (
              <ul className="ag-list-rows">
                {apps.map(app => {
                  const st = statusKey(app.status);
                  const { startMin, endMin, duration } = appointmentSpan(app);
                  return (
                    <li key={app.id} className={`ag-row st-${st} ${activeId === app.id ? 'is-active' : ''}`}>
                      <button type="button" className="ag-row-main" onClick={() => onOpen(app.id)}>
                        <span className="ag-row-time">
                          <strong>{toHHmm(startMin)}</strong>
                          <small>{toHHmm(endMin)}</small>
                        </span>
                        <span className="ag-row-who">
                          <strong>{app.nomePaciente}</strong>
                          <small>{app.observacao || formatDuration(duration)}</small>
                        </span>
                        <span className="ag-row-prof">{app.nomeProfissional}</span>
                        <span className={`ag-pill st-${st}`}>{statusLabel(app.status)}</span>
                      </button>
                      <span className="ag-row-action">
                        {st === 'agendado' && !isPast && (
                          <button type="button" className="btn btn-secondary" onClick={() => onConfirm(app)} disabled={busyId === app.id}>
                            <Check size={15} /> Confirmar
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
