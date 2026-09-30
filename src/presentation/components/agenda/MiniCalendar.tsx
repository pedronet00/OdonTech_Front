import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniCalendarProps {
  month: Date;
  selected: Date;
  today: Date;
  /** Active (non-cancelled) appointments per day, keyed by yyyy-MM-dd. */
  counts: Map<string, number>;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MiniCalendar({ month, selected, today, counts, onMonthChange, onSelect }: MiniCalendarProps) {
  const first = startOfWeek(startOfMonth(month), { locale: ptBR });
  const last = endOfWeek(endOfMonth(month), { locale: ptBR });

  const days: Date[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);

  return (
    <div className="ag-mini">
      <div className="ag-mini-head">
        <span className="ag-mini-title">{format(month, "MMMM 'de' yyyy", { locale: ptBR })}</span>
        <div className="ag-mini-nav">
          <button type="button" className="ag-icon-btn" onClick={() => onMonthChange(subMonths(month, 1))} aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="ag-icon-btn" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="ag-mini-grid">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="ag-mini-weekday" aria-hidden="true">{d}</span>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const count = counts.get(key) ?? 0;
          const classes = [
            'ag-mini-day',
            !isSameMonth(day, month) && 'is-outside',
            isSameDay(day, today) && 'is-today',
            isSameDay(day, selected) && 'is-selected',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={key}
              type="button"
              className={classes}
              onClick={() => onSelect(day)}
              aria-pressed={isSameDay(day, selected)}
              aria-label={`${format(day, "d 'de' MMMM", { locale: ptBR })}, ${count === 0 ? 'sem consultas' : count === 1 ? '1 consulta' : `${count} consultas`}`}
            >
              <span>{format(day, 'd')}</span>
              <span className="ag-mini-dots" aria-hidden="true">
                {Array.from({ length: Math.min(count, 3) }, (_, i) => <i key={i} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
