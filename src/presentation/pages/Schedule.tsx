import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Columns3, List, Plus } from 'lucide-react';
import {
  addDays, addMinutes, addMonths, addWeeks, endOfMonth, endOfWeek, format, isBefore, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../application/contexts/AuthContext';
import ApiClient from '../../infrastructure/api/apiClient';
import type { Agendamento, Patient, Profissional, NovoAgendamento } from '../../domain/models/types';
import toast from 'react-hot-toast';
import { MiniCalendar } from '../components/agenda/MiniCalendar';
import { DayTimeline, type TimelineColumn } from '../components/agenda/DayTimeline';
import { AppointmentDetailPanel, NewAppointmentPanel, type NewAppointmentForm } from '../components/agenda/AppointmentPanels';
import { AppointmentList } from '../components/agenda/AppointmentList';
import { MonthCalendar } from '../components/agenda/MonthCalendar';
import {
  STATUS_META, STATUS_ORDER, SLOT_MIN,
  appointmentSpan, dayRange, fromHHmm, minutesOfDay, statusKey, toHHmm,
} from '../components/agenda/agendaUtils';
import './Schedule.css';

type Panel = { mode: 'create' } | { mode: 'detail'; id: string } | null;
type View = 'grade' | 'lista' | 'calendario';

const VIEWS: { id: View; label: string; shortcut: string; Icon: typeof List }[] = [
  { id: 'grade', label: 'Grade', shortcut: 'G', Icon: Columns3 },
  { id: 'lista', label: 'Lista', shortcut: 'L', Icon: List },
  { id: 'calendario', label: 'Calendário', shortcut: 'C', Icon: CalendarRange },
];

const STEP_LABELS: Record<View, [string, string]> = {
  grade: ['Dia anterior', 'Próximo dia'],
  lista: ['Semana anterior', 'Próxima semana'],
  calendario: ['Mês anterior', 'Próximo mês'],
};

const VIEW_STORAGE_KEY = 'agenda-view';

const readStoredView = (): View => {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'grade' || stored === 'lista' || stored === 'calendario') return stored;
  } catch { /* storage unavailable: fall back to the grid */ }
  return 'grade';
};

const countLabel = (n: number) => (n === 0 ? 'Nenhuma consulta' : n === 1 ? '1 consulta' : `${n} consultas`);

const errorMessage = (err: unknown, fallback = 'Algo deu errado. Tente novamente.') =>
  err instanceof Error && err.message ? err.message : fallback;

const EMPTY_FORM: NewAppointmentForm = { pacienteId: '', profissionalId: '', time: '', duration: 30, observacao: '' };

export function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [now, setNow] = useState(new Date());

  // Data State
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [showCalendarMobile, setShowCalendarMobile] = useState(false);
  const [view, setView] = useState<View>(readStoredView);

  // Panel State
  const [panel, setPanel] = useState<Panel>(null);
  const [form, setForm] = useState<NewAppointmentForm>(EMPTY_FORM);
  const [detail, setDetail] = useState<Agendamento | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.clinica_id) return;
    Promise.all([
      ApiClient.get<Patient[]>(`/pacientes/clinica/${user.clinica_id}`),
      ApiClient.get<Profissional[]>(`/profissionais/clinica/${user.clinica_id}`).catch(() => [] as Profissional[]),
    ])
      .then(([pData, profData]) => {
        setPatients(pData);
        setProfessionals(profData.length > 0 ? profData : [
          { id: '08deae4d-edca-4250-8e1f-0d51dd5b2fc2', nome: 'pedro', email: '', cro: '', clinicaId: user.clinica_id }
        ]);
      })
      .catch((err: unknown) => toast.error(errorMessage(err, 'Erro ao carregar pacientes e profissionais.')));
  }, [user?.clinica_id]);

  const [reloadKey, setReloadKey] = useState(0);
  const fetchAppointments = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  useEffect(() => {
    if (!user?.clinica_id) return;
    let ignore = false;
    const url = filterProfessionalId === 'all'
      ? `/agendamentos/clinica/${user.clinica_id}`
      : `/agendamentos/profissional/${filterProfessionalId}`;
    ApiClient.get<Agendamento[]>(url)
      .then(data => { if (!ignore) setAppointments(data); })
      .catch((err: unknown) => toast.error(errorMessage(err, 'Erro ao carregar a agenda.')))
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [user?.clinica_id, filterProfessionalId, reloadKey]);

  // Derived data
  const dayKey = format(selectedDate, 'yyyy-MM-dd');

  const dayAppointments = useMemo(
    () => appointments.filter(a => isSameDay(parseISO(a.dataHoraInicio), selectedDate)),
    [appointments, selectedDate],
  );

  const visibleAppointments = useMemo(
    () => showCancelled ? dayAppointments : dayAppointments.filter(a => statusKey(a.status) !== 'cancelado'),
    [dayAppointments, showCancelled],
  );

  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments) {
      if (statusKey(a.status) === 'cancelado') continue;
      const key = a.dataHoraInicio.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [appointments]);

  // Period covered by the current view: one day, its week, or its month.
  const range = useMemo(() => {
    if (view === 'lista') return { start: startOfWeek(selectedDate, { locale: ptBR }), end: endOfWeek(selectedDate, { locale: ptBR }) };
    if (view === 'calendario') return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    return { start: selectedDate, end: selectedDate };
  }, [view, selectedDate]);

  const rangeStartKey = format(range.start, 'yyyy-MM-dd');
  const rangeEndKey = format(range.end, 'yyyy-MM-dd');
  const todayKey = format(now, 'yyyy-MM-dd');
  const rangeHasToday = todayKey >= rangeStartKey && todayKey <= rangeEndKey;

  const rangeAppointments = useMemo(
    () => appointments.filter(a => {
      const key = a.dataHoraInicio.slice(0, 10);
      return key >= rangeStartKey && key <= rangeEndKey;
    }),
    [appointments, rangeStartKey, rangeEndKey],
  );

  const shownAppointments = useMemo(
    () => showCancelled ? appointments : appointments.filter(a => statusKey(a.status) !== 'cancelado'),
    [appointments, showCancelled],
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate, { locale: ptBR }), i)),
    [selectedDate],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of rangeAppointments) {
      const key = statusKey(a.status);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [rangeAppointments]);

  const columns: TimelineColumn[] = useMemo(() => {
    if (filterProfessionalId !== 'all') {
      const prof = professionals.find(p => p.id === filterProfessionalId);
      return [{ id: filterProfessionalId, nome: prof?.nome ?? 'Profissional' }];
    }
    const cols: TimelineColumn[] = professionals.map(p => ({ id: p.id, nome: p.nome }));
    for (const a of visibleAppointments) {
      if (!cols.some(c => c.id === a.profissionalId)) cols.push({ id: a.profissionalId, nome: a.nomeProfissional });
    }
    return cols.length ? cols : [{ id: '', nome: 'Agenda' }];
  }, [filterProfessionalId, professionals, visibleAppointments]);

  const { startMin, endMin } = useMemo(() => dayRange(visibleAppointments), [visibleAppointments]);

  const isToday = isSameDay(selectedDate, now);
  const nextUp = rangeHasToday
    ? appointments
      .filter(a => a.dataHoraInicio.slice(0, 10) === todayKey)
      .filter(a => ['agendado', 'confirmado'].includes(statusKey(a.status)) && appointmentSpan(a).endMin > minutesOfDay(now))
      .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))[0]
    : undefined;

  const findConflict = useCallback((profissionalId: string, date: string, start: number, duration: number, ignoreId?: string) => {
    return appointments.find(a => {
      if (a.id === ignoreId || a.profissionalId !== profissionalId) return false;
      if (a.dataHoraInicio.slice(0, 10) !== date) return false;
      const key = statusKey(a.status);
      if (key === 'cancelado' || key === 'falta') return false;
      const span = appointmentSpan(a);
      return span.startMin < start + duration && start < span.endMin;
    }) ?? null;
  }, [appointments]);

  // Navigation
  const goToDate = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, visibleMonth)) setVisibleMonth(date);
    setShowCalendarMobile(false);
  };

  /** Moves one unit of the current view: a day, a week or a month. */
  const step = (dir: 1 | -1) => {
    goToDate(view === 'lista' ? addWeeks(selectedDate, dir) : view === 'calendario' ? addMonths(selectedDate, dir) : addDays(selectedDate, dir));
  };

  const changeView = (next: View) => {
    setView(next);
    try { localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* storage unavailable */ }
  };

  const openDayInGrid = (date: Date) => {
    goToDate(date);
    changeView('grade');
  };

  const closePanel = () => {
    setPanel(null);
    setDetail(null);
  };

  // Keyboard: ← → move one period, T jumps to today, G/L/C switch views, Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel) { closePanel(); return; }
      const target = e.target as HTMLElement;
      if (panel || e.metaKey || e.ctrlKey || e.altKey || target.closest('input, textarea, select, [contenteditable]')) return;
      const key = e.key.toLowerCase();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      if (key === 't') goToDate(new Date());
      const shortcut = VIEWS.find(v => v.shortcut.toLowerCase() === key);
      if (shortcut) changeView(shortcut.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Flows
  const openCreate = ({ profissionalId, time, pacienteId, date }: { profissionalId?: string; time?: string; pacienteId?: string; date?: Date } = {}) => {
    if (date) goToDate(date);
    const fallbackTime = () => {
      if (!isSameDay(date ?? selectedDate, now)) return '08:00';
      const next = Math.ceil((minutesOfDay(now) + 1) / SLOT_MIN) * SLOT_MIN;
      return toHHmm(Math.min(next, 21 * 60 + 45));
    };
    setForm(prev => ({
      ...(panel?.mode === 'create' ? prev : EMPTY_FORM),
      ...(pacienteId ? { pacienteId } : {}),
      profissionalId: profissionalId || (filterProfessionalId !== 'all' ? filterProfessionalId : (panel?.mode === 'create' ? prev.profissionalId : '')),
      time: time ?? fallbackTime(),
    }));
    setDetail(null);
    setPanel({ mode: 'create' });
  };

  const openDetail = async (id: string) => {
    const local = appointments.find(a => a.id === id) ?? null;
    setDetail(local);
    setPanel({ mode: 'detail', id });
    try {
      const data = await ApiClient.get<Agendamento>(`/agendamentos/${id}`);
      setDetail(current => (current && current.id !== id ? current : data));
    } catch (err: unknown) {
      toast.error(errorMessage(err));
      if (!local) closePanel();
    }
  };

  const handleCreate = async () => {
    if (!form.pacienteId || !form.profissionalId || !form.time) {
      toast.error('Escolha o paciente, o profissional e o horário.');
      return;
    }

    const start = parseISO(`${dayKey}T${form.time}:00`);
    if (isBefore(start, new Date())) {
      toast.error('Esse horário já passou. Escolha outro horário.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: NovoAgendamento = {
        pacienteId: form.pacienteId,
        profissionalId: form.profissionalId,
        dataHoraInicio: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        dataHoraFim: format(addMinutes(start, form.duration), "yyyy-MM-dd'T'HH:mm:ss"),
        observacao: form.observacao,
      };
      await ApiClient.post('/agendamentos', payload);
      toast.success(`Consulta agendada para ${format(start, "dd/MM 'às' HH:mm")}.`);
      setForm(EMPTY_FORM);
      closePanel();
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Não foi possível agendar a consulta.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (app: Agendamento, action: 'confirmar' | 'cancelar' | 'falta') => {
    const messages = {
      confirmar: `Presença de ${app.nomePaciente} confirmada.`,
      cancelar: 'Consulta cancelada.',
      falta: 'Falta registrada.',
    };
    const statuses = { confirmar: 'Confirmado', cancelar: 'Cancelado', falta: 'Falta' };
    try {
      setIsSaving(true);
      setBusyId(app.id);
      await ApiClient.patch(`/agendamentos/${app.id}/${action}`);
      toast.success(messages[action]);
      setDetail(current => (current && current.id === app.id ? { ...current, status: statuses[action] } : current));
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
      setBusyId(null);
    }
  };

  const handleStartAtendimento = async () => {
    if (!detail) return;
    try {
      setIsSaving(true);
      const now = new Date();
      const payload: { descricao: string; dente: null; tipoAtendimento: number; dataAtendimento?: string } = {
        descricao: `Atendimento gerado a partir do agendamento. Obs: ${detail.observacao || 'Nenhuma'}`,
        dente: null,
        tipoAtendimento: 1 // Consulta
      };

      // Se a data/hora atual for posterior à do agendamento, envia a atual
      if (isBefore(parseISO(detail.dataHoraInicio), now)) {
        payload.dataAtendimento = format(now, "yyyy-MM-dd'T'HH:mm:ss");
      }

      await ApiClient.post(`/atendimentos/agendamento/${detail.id}`, payload);
      toast.success('Atendimento iniciado. Abrindo o prontuário…');
      navigate(`/prontuarios/${detail.pacienteId}`);
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReschedule = async (date: string, time: string) => {
    if (!detail) return;
    const start = parseISO(`${date}T${time}:00`);
    if (isBefore(start, new Date())) {
      toast.error('Esse horário já passou. Escolha outro horário.');
      return;
    }
    try {
      setIsSaving(true);
      const duration = appointmentSpan(detail).duration;
      await ApiClient.patch(`/agendamentos/${detail.id}/reagendar`, {
        dataHoraInicio: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        dataHoraFim: format(addMinutes(start, duration), "yyyy-MM-dd'T'HH:mm:ss")
      });
      toast.success(`Consulta reagendada para ${format(start, "dd/MM 'às' HH:mm")}.`);
      closePanel();
      goToDate(start);
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const draft = panel?.mode === 'create' && form.time
    ? { profissionalId: form.profissionalId, startMin: fromHHmm(form.time), duration: form.duration }
    : null;

  const summaryTotal = rangeAppointments.length - (statusCounts.cancelado ?? 0);
  const periodWord = view === 'lista' ? 'nesta semana' : view === 'calendario' ? 'no mês' : isToday ? 'hoje' : 'neste dia';
  const stepIsCurrent = view === 'grade' ? isToday : rangeHasToday;

  const title = (() => {
    if (view === 'grade') {
      return {
        day: format(selectedDate, 'd'),
        main: format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }),
        sub: `${isToday ? 'Hoje, ' : ''}${format(selectedDate, 'EEEE', { locale: ptBR })}`,
      };
    }
    if (view === 'lista') {
      const { start, end } = range;
      const main = isSameMonth(start, end)
        ? `${format(start, 'd')} a ${format(end, "d 'de' MMMM", { locale: ptBR })}`
        : `${format(start, "d 'de' MMM", { locale: ptBR })} a ${format(end, "d 'de' MMM", { locale: ptBR })}`;
      return { day: null, main, sub: rangeHasToday ? 'Esta semana' : format(end, 'yyyy') };
    }
    return {
      day: null,
      main: format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }),
      sub: `${countLabel(summaryTotal)} no mês`,
    };
  })();

  return (
    <div className={`ag-page animate-fade-in view-${view} ${panel ? 'has-panel' : ''}`}>
      <header className="ag-header">
        <div className="ag-header-date">
          <h1 className={`ag-title ${title.day ? '' : 'is-range'}`}>
            {title.day && <span className="ag-title-day">{title.day}</span>}
            <span className="ag-title-rest">
              <span className="ag-title-month">{title.main}</span>
              <span className="ag-title-weekday">{title.sub}</span>
            </span>
          </h1>
          <div className="ag-daynav" role="group" aria-label="Navegar pela agenda">
            <button type="button" className="ag-icon-btn is-bordered" onClick={() => step(-1)} aria-label={STEP_LABELS[view][0]} title={`${STEP_LABELS[view][0]} (←)`}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="btn btn-secondary ag-today" onClick={() => goToDate(new Date())} disabled={stepIsCurrent} title="Ir para hoje (T)">
              Hoje
            </button>
            <button type="button" className="ag-icon-btn is-bordered" onClick={() => step(1)} aria-label={STEP_LABELS[view][1]} title={`${STEP_LABELS[view][1]} (→)`}>
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="ag-icon-btn is-bordered ag-mobile-only ag-side-toggle"
              onClick={() => setShowCalendarMobile(v => !v)}
              aria-expanded={showCalendarMobile}
              aria-label="Escolher data no calendário"
            >
              <CalendarDays size={18} />
            </button>
          </div>
        </div>

        <div className="ag-header-actions">
          <div className="ag-views" role="radiogroup" aria-label="Modo de visualização">
            {VIEWS.map(({ id, label, shortcut, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={view === id}
                className={view === id ? 'is-on' : ''}
                onClick={() => changeView(id)}
                title={`${label} (${shortcut})`}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <label className="ag-sr-only" htmlFor="ag-filter">Profissional</label>
          <select
            id="ag-filter"
            className="input-field ag-filter"
            value={filterProfessionalId}
            onChange={e => { setLoading(true); setFilterProfessionalId(e.target.value); }}
          >
            <option value="all">Todos os profissionais</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button type="button" className="btn btn-primary ag-new" onClick={() => openCreate()} title="Novo Agendamento">
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      </header>

      <div className="ag-body">
        <aside className={`ag-side ${showCalendarMobile ? 'is-open' : ''}`}>
          <MiniCalendar
            month={visibleMonth}
            selected={selectedDate}
            today={now}
            counts={monthCounts}
            onMonthChange={setVisibleMonth}
            onSelect={goToDate}
          />

          <section className="ag-summary" aria-label={view === 'lista' ? 'Resumo da semana' : 'Resumo do dia'}>
            {nextUp && (
              <button type="button" className="ag-next" onClick={() => openDetail(nextUp.id)}>
                <span className="ag-next-label">Próximo paciente</span>
                <span className="ag-next-name">{nextUp.nomePaciente}</span>
                <span className="ag-next-time">{format(parseISO(nextUp.dataHoraInicio), 'HH:mm')} com {nextUp.nomeProfissional}</span>
              </button>
            )}

            <h2 className="ag-summary-title">
              {countLabel(summaryTotal)}
              <span> {periodWord}</span>
            </h2>

            {rangeAppointments.length === 0 ? (
              <p className="ag-hint">
                {view === 'grade' ? 'Clique em um horário livre na grade para agendar.' : 'Use o + ao lado de um dia para agendar.'}
              </p>
            ) : (
              <ul className="ag-legend">
                {STATUS_ORDER.map(key => (
                  <li key={key} className={!statusCounts[key] ? 'is-zero' : ''}>
                    <i className={`ag-swatch st-${key}`} aria-hidden="true" />
                    <span>{STATUS_META[key].plural}</span>
                    <strong>{statusCounts[key] ?? 0}</strong>
                  </li>
                ))}
              </ul>
            )}

            <label className="ag-toggle">
              <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} />
              <span>Mostrar consultas canceladas</span>
            </label>
          </section>
        </aside>

        <main className="ag-main" aria-label={`Agenda: ${title.main}`}>
          {view === 'grade' && (
            <DayTimeline
              date={selectedDate}
              now={now}
              columns={columns}
              appointments={visibleAppointments}
              startMin={startMin}
              endMin={endMin}
              loading={loading}
              activeId={panel?.mode === 'detail' ? panel.id : null}
              draft={draft}
              onSlotClick={(profissionalId, time) => openCreate({ profissionalId, time })}
              onAppointmentClick={openDetail}
            />
          )}
          {view === 'lista' && (
            <AppointmentList
              days={weekDays}
              now={now}
              appointments={shownAppointments}
              loading={loading}
              activeId={panel?.mode === 'detail' ? panel.id : null}
              busyId={busyId}
              onOpen={openDetail}
              onConfirm={app => handleUpdateStatus(app, 'confirmar')}
              onCreate={date => openCreate({ date })}
            />
          )}
          {view === 'calendario' && (
            <MonthCalendar
              month={selectedDate}
              selected={selectedDate}
              now={now}
              appointments={shownAppointments}
              loading={loading}
              activeId={panel?.mode === 'detail' ? panel.id : null}
              onOpenDay={openDayInGrid}
              onOpen={openDetail}
              onCreate={date => openCreate({ date })}
            />
          )}
        </main>

        {panel && <div className="ag-scrim" onClick={closePanel} aria-hidden="true" />}
        {panel && (
          <aside className="ag-panel" aria-label={panel.mode === 'create' ? 'Novo Agendamento' : 'Detalhes da consulta'}>
            {panel.mode === 'create' && (
              <NewAppointmentPanel
                date={selectedDate}
                now={now}
                form={form}
                patients={patients}
                professionals={professionals}
                saving={isSaving}
                findConflict={findConflict}
                onDateChange={goToDate}
                onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
                onSubmit={handleCreate}
                onClose={closePanel}
              />
            )}
            {panel.mode === 'detail' && detail && (
              <AppointmentDetailPanel
                key={detail.id}
                appointment={detail}
                now={now}
                busy={isSaving}
                findConflict={findConflict}
                onConfirm={() => handleUpdateStatus(detail, 'confirmar')}
                onStart={handleStartAtendimento}
                onNoShow={() => handleUpdateStatus(detail, 'falta')}
                onCancel={() => handleUpdateStatus(detail, 'cancelar')}
                onReschedule={handleReschedule}
                onBookAgain={() => openCreate({ profissionalId: detail.profissionalId, pacienteId: detail.pacienteId })}
                onOpenRecord={() => navigate(`/prontuarios/${detail.pacienteId}`)}
                onClose={closePanel}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
