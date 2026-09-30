import { parseISO, differenceInMinutes } from 'date-fns';
import type { Agendamento } from '../../../domain/models/types';

export type StatusKey = 'agendado' | 'confirmado' | 'ematendimento' | 'realizado' | 'falta' | 'cancelado' | 'outro';

export const STATUS_META: Record<Exclude<StatusKey, 'outro'>, { label: string; plural: string }> = {
  agendado: { label: 'A confirmar', plural: 'A confirmar' },
  confirmado: { label: 'Confirmado', plural: 'Confirmados' },
  ematendimento: { label: 'Em atendimento', plural: 'Em atendimento' },
  realizado: { label: 'Atendido', plural: 'Atendidos' },
  falta: { label: 'Faltou', plural: 'Faltas' },
  cancelado: { label: 'Cancelado', plural: 'Cancelados' },
};

export const STATUS_ORDER: Exclude<StatusKey, 'outro'>[] = ['agendado', 'confirmado', 'ematendimento', 'realizado', 'falta', 'cancelado'];

export const normalizeText = (value: string | null | undefined) =>
  (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function statusKey(status: string | null | undefined): StatusKey {
  switch (normalizeText(status).replace(/\s/g, '')) {
    case 'agendado': return 'agendado';
    case 'confirmado': return 'confirmado';
    case 'realizado':
    case 'concluido':
    case 'atendido': return 'realizado';
    case 'ematendimento': return 'ematendimento';
    case 'falta':
    case 'faltou': return 'falta';
    case 'cancelado': return 'cancelado';
    default: return 'outro';
  }
}

export function statusLabel(status: string) {
  const key = statusKey(status);
  return key === 'outro' ? status : STATUS_META[key].label;
}

/** Height in pixels of one hour on the day grid. */
export const HOUR_PX = 84;
export const PX_PER_MIN = HOUR_PX / 60;
export const SLOT_MIN = 30;

export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

export const toHHmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const fromHHmm = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function appointmentSpan(app: Agendamento) {
  const start = parseISO(app.dataHoraInicio);
  const startMin = minutesOfDay(start);
  const duration = app.duracaoMinutos || differenceInMinutes(parseISO(app.dataHoraFim), start) || SLOT_MIN;
  return { startMin, endMin: startMin + duration, duration };
}

export interface PlacedAppointment {
  app: Agendamento;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

/** Places overlapping appointments side by side, like a calendar app. */
export function layoutLanes(apps: Agendamento[]): PlacedAppointment[] {
  const items: PlacedAppointment[] = apps
    .map(app => ({ app, ...appointmentSpan(app), lane: 0, lanes: 1 }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  let cluster: PlacedAppointment[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(...cluster.map(c => c.lane)) + 1;
    cluster.forEach(c => { c.lanes = lanes; });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) flush();
    const busy = new Set(cluster.filter(c => c.endMin > item.startMin).map(c => c.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();

  return items;
}

/** Visible hours of the day: 08h–19h, stretched to fit any appointment outside it. */
export function dayRange(apps: Agendamento[]) {
  let startMin = 8 * 60;
  let endMin = 19 * 60;
  for (const app of apps) {
    const span = appointmentSpan(app);
    startMin = Math.min(startMin, Math.floor(span.startMin / 60) * 60);
    endMin = Math.max(endMin, Math.ceil(span.endMin / 60) * 60);
  }
  return { startMin: Math.max(0, startMin), endMin: Math.min(24 * 60, endMin) };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
