import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import type { Agendamento } from '../../../domain/models/types';
import {
  HOUR_PX, PX_PER_MIN, SLOT_MIN,
  formatDuration, initials, layoutLanes, minutesOfDay, statusKey, statusLabel, toHHmm,
} from './agendaUtils';

export interface TimelineColumn {
  /** Professional id; empty when the column shows every professional. */
  id: string;
  nome: string;
}

export interface TimelineDraft {
  profissionalId: string;
  startMin: number;
  duration: number;
}

interface DayTimelineProps {
  date: Date;
  now: Date;
  columns: TimelineColumn[];
  appointments: Agendamento[];
  startMin: number;
  endMin: number;
  loading: boolean;
  activeId: string | null;
  draft: TimelineDraft | null;
  onSlotClick: (profissionalId: string, time: string) => void;
  onAppointmentClick: (id: string) => void;
}

export function DayTimeline({
  date, now, columns, appointments, startMin, endMin, loading, activeId, draft, onSlotClick, onAppointmentClick,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayKey = format(date, 'yyyy-MM-dd');
  const isToday = dayKey === format(now, 'yyyy-MM-dd');
  const isPastDay = dayKey < format(now, 'yyyy-MM-dd');
  const nowMin = minutesOfDay(now);
  const heightPx = (endMin - startMin) * PX_PER_MIN;
  const showHeads = columns.length > 1;

  // Minutes (relative to the grid top) that are already in the past.
  const pastUntil = isPastDay ? endMin : isToday ? Math.min(Math.max(nowMin, startMin), endMin) : startMin;

  const byColumn = useMemo(() => {
    const map = new Map<string, ReturnType<typeof layoutLanes>>();
    for (const col of columns) {
      const apps = col.id ? appointments.filter(a => a.profissionalId === col.id) : appointments;
      map.set(col.id, layoutLanes(apps));
    }
    return map;
  }, [columns, appointments]);

  const slots = useMemo(() => {
    const list: number[] = [];
    for (let m = startMin; m < endMin; m += SLOT_MIN) list.push(m);
    return list;
  }, [startMin, endMin]);

  const hours = [...slots.filter(m => m % 60 === 0), endMin];

  // Bring the relevant part of the day into view whenever the day changes
  // (but not on every refetch, so the grid doesn't jump after an action).
  const scrolledDay = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || scrolledDay.current === dayKey) return;
    scrolledDay.current = dayKey;
    let target = 0;
    if (isToday) {
      target = (nowMin - startMin) * PX_PER_MIN - 120;
    } else if (appointments.length) {
      const first = Math.min(...appointments.map(a => minutesOfDay(new Date(a.dataHoraInicio))));
      target = (first - startMin) * PX_PER_MIN - 48;
    }
    el.scrollTop = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, loading]);

  // Keep the draft preview visible while the form is being filled.
  const draftKey = draft ? `${draft.profissionalId}-${draft.startMin}` : '';
  useEffect(() => {
    if (!draftKey) return;
    scrollRef.current?.querySelector('.ag-draft')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [draftKey]);

  const top = (min: number) => (min - startMin) * PX_PER_MIN;

  return (
    <div className={`ag-timeline ${loading ? 'is-loading' : ''}`} ref={scrollRef}>
      <div className="ag-timeline-inner" style={{ ['--cols' as string]: columns.length }}>
        {showHeads && (
          <div className="ag-col-heads">
            <div className="ag-gutter-corner" />
            {columns.map(col => {
              const count = (byColumn.get(col.id) ?? []).filter(p => statusKey(p.app.status) !== 'cancelado').length;
              return (
                <div key={col.id} className="ag-col-head">
                  <span className="ag-avatar" aria-hidden="true">{initials(col.nome)}</span>
                  <span className="ag-col-name">{col.nome}</span>
                  <span className="ag-col-count">{count === 0 ? 'Livre' : count === 1 ? '1 consulta' : `${count} consultas`}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="ag-grid" style={{ height: heightPx, ['--hour' as string]: `${HOUR_PX}px` }}>
          <div className="ag-gutter" aria-hidden="true">
            {hours.map(m => (
              <span key={m} className="ag-hour-label" style={{ top: top(m) }}>{toHHmm(m)}</span>
            ))}
          </div>

          {columns.map(col => (
            <div key={col.id} className="ag-col">
              {pastUntil > startMin && <div className="ag-past" style={{ height: top(pastUntil) }} />}

              {slots.map(m => {
                const disabled = isPastDay || (isToday && m < nowMin);
                return (
                  <button
                    key={m}
                    type="button"
                    className="ag-slot"
                    style={{ top: top(m), height: SLOT_MIN * PX_PER_MIN }}
                    disabled={disabled}
                    onClick={() => onSlotClick(col.id, toHHmm(m))}
                    aria-label={`Agendar às ${toHHmm(m)}${col.id ? ` com ${col.nome}` : ''}`}
                  >
                    <span>+ {toHHmm(m)}</span>
                  </button>
                );
              })}

              {(byColumn.get(col.id) ?? []).map(({ app, startMin: s, endMin: e, lane, lanes }) => {
                const key = statusKey(app.status);
                const h = Math.max((e - s) * PX_PER_MIN - 3, 22);
                const size = h < 44 ? 'is-compact' : h < 70 ? 'is-medium' : '';
                return (
                  <button
                    key={app.id}
                    type="button"
                    className={`ag-appt st-${key} ${size} ${activeId === app.id ? 'is-active' : ''}`}
                    style={{
                      top: top(s) + 1,
                      height: h,
                      left: `calc(${(lane / lanes) * 100}% + 4px)`,
                      width: `calc(${100 / lanes}% - 8px)`,
                    }}
                    onClick={() => onAppointmentClick(app.id)}
                    aria-label={`${app.nomePaciente}, ${toHHmm(s)} às ${toHHmm(e)}, ${statusLabel(app.status)}`}
                  >
                    <span className="ag-appt-line">
                      <span className="ag-appt-time">{toHHmm(s)}</span>
                      <span className="ag-appt-name">{app.nomePaciente}</span>
                      {key === 'realizado' && <Check size={14} className="ag-appt-check" aria-hidden="true" />}
                    </span>
                    {!size && (
                      <span className="ag-appt-meta">
                        {key === 'agendado' || key === 'confirmado'
                          ? (app.observacao || formatDuration(e - s))
                          : statusLabel(app.status)}
                      </span>
                    )}
                    {!size && !col.id && <span className="ag-appt-meta">{app.nomeProfissional}</span>}
                  </button>
                );
              })}

              {draft && (draft.profissionalId === col.id || !col.id) && (
                <div
                  className="ag-draft"
                  style={{ top: top(draft.startMin) + 1, height: Math.max(draft.duration * PX_PER_MIN - 3, 22) }}
                  aria-hidden="true"
                >
                  <span className="ag-appt-time">{toHHmm(draft.startMin)}</span> Novo Agendamento
                </div>
              )}
            </div>
          ))}

          {isToday && nowMin >= startMin && nowMin <= endMin && (
            <div className="ag-now" style={{ top: top(nowMin) }} aria-hidden="true">
              <span className="ag-now-label">{format(now, 'HH:mm')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
