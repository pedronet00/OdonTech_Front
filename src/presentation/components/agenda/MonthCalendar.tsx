import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import type { Agendamento } from '../../../domain/models/types';
import { appointmentSpan, statusKey, statusLabel, toHHmm } from './agendaUtils';

interface MonthCalendarProps {
  month: Date;
  selected: Date;
  now: Date;
  appointments: Agendamento[];
  loading: boolean;
  activeId: string | null;
  onOpenDay: (date: Date) => void;
  onOpen: (id: string) => void;
  onCreate: (date: Date) => void;
}

const MAX_CHIPS = 3;

export function MonthCalendar({ month, selected, now, appointments, loading, activeId, onOpenDay, onOpen, onCreate }: MonthCalendarProps) {
  const first = startOfWeek(startOfMonth(month), { locale: ptBR });
  const last = endOfWeek(endOfMonth(month), { locale: ptBR });
  const todayKey = format(now, 'yyyy-MM-dd');
  const selectedKey = format(selected, 'yyyy-MM-dd');

  const byDay = new Map<string, Agendamento[]>();
  for (const a of appointments) {
    const key = a.dataHoraInicio.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  const days: Date[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);

  return (
    <div className={`ag-cal ${loading ? 'is-loading' : ''}`} style={{ ['--weeks' as string]: days.length / 7 }}>
      {days.slice(0, 7).map(d => (
        <span key={d.toISOString()} className="ag-cal-weekday ag-cap">{format(d, 'EEE', { locale: ptBR }).replace('.', '')}</span>
      ))}

      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const apps = (byDay.get(key) ?? []).sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
        const active = apps.filter(a => statusKey(a.status) !== 'cancelado').length;
        const isPast = key < todayKey;
        const label = format(day, "d 'de' MMMM", { locale: ptBR });
        const classes = [
          'ag-cal-cell',
          !isSameMonth(day, month) && 'is-outside',
          isPast && 'is-past',
          key === todayKey && 'is-today',
          key === selectedKey && 'is-selected',
        ].filter(Boolean).join(' ');

        return (
          <div key={key} className={classes} onClick={() => onOpenDay(day)}>
            <div className="ag-cal-cell-head">
              <button
                type="button"
                className="ag-cal-date"
                onClick={e => { e.stopPropagation(); onOpenDay(day); }}
                aria-label={`Abrir ${label} na grade, ${active === 1 ? '1 consulta' : `${active} consultas`}`}
              >
                {format(day, 'd')}
              </button>
              {!isPast && (
                <button
                  type="button"
                  className="ag-cal-add"
                  onClick={e => { e.stopPropagation(); onCreate(day); }}
                  aria-label={`Novo Agendamento em ${label}`}
                  title="Novo Agendamento neste dia"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            <div className="ag-cal-chips">
              {apps.slice(0, MAX_CHIPS).map(app => {
                const st = statusKey(app.status);
                return (
                  <button
                    key={app.id}
                    type="button"
                    className={`ag-chip st-${st} ${activeId === app.id ? 'is-active' : ''}`}
                    onClick={e => { e.stopPropagation(); onOpen(app.id); }}
                    title={`${app.nomePaciente}, ${statusLabel(app.status)}`}
                  >
                    <span className="ag-chip-time">{toHHmm(appointmentSpan(app).startMin)}</span>
                    <span className="ag-chip-name">{app.nomePaciente}</span>
                  </button>
                );
              })}
              {apps.length > MAX_CHIPS && (
                <button type="button" className="ag-chip-more" onClick={e => { e.stopPropagation(); onOpenDay(day); }}>
                  mais {apps.length - MAX_CHIPS}
                </button>
              )}
            </div>

            {active > 0 && (
              <span className="ag-cal-dots" aria-hidden="true">
                {Array.from({ length: Math.min(active, 3) }, (_, i) => <i key={i} />)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
