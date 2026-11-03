/**
 * Numeração dentária FDI (ISO 3950), a usada no campo "Número do Dente".
 * Dezena = quadrante, unidade = posição a partir da linha média.
 *   Permanentes: quadrantes 1–4, posições 1–8.
 *   Decíduos (de leite): quadrantes 5–8, posições 1–5.
 */

export type Arch = 'superior' | 'inferior';
export type Side = 'direito' | 'esquerdo';

export interface ToothInfo {
  fdi: number;
  /** Quadrante permanente equivalente (1–4). */
  quadrant: 1 | 2 | 3 | 4;
  /** Posição a partir da linha média (1–8). */
  position: number;
  deciduous: boolean;
  arch: Arch;
  /** Lado do paciente. */
  side: Side;
  name: string;
}

const PERMANENT_NAMES = [
  'Incisivo central', 'Incisivo lateral', 'Canino', '1º pré-molar',
  '2º pré-molar', '1º molar', '2º molar', '3º molar (siso)',
];

const DECIDUOUS_NAMES = [
  'Incisivo central decíduo', 'Incisivo lateral decíduo', 'Canino decíduo',
  '1º molar decíduo', '2º molar decíduo',
];

/** Interpreta um número FDI; devolve null quando não é um dente válido. */
export function parseFdi(fdi: number | null | undefined): ToothInfo | null {
  if (!fdi || !Number.isInteger(fdi)) return null;
  const q = Math.floor(fdi / 10);
  const position = fdi % 10;
  const deciduous = q >= 5 && q <= 8;
  if (!(q >= 1 && q <= 8) || position < 1 || position > (deciduous ? 5 : 8)) return null;

  const quadrant = (deciduous ? q - 4 : q) as 1 | 2 | 3 | 4;
  return {
    fdi,
    quadrant,
    position,
    deciduous,
    arch: quadrant <= 2 ? 'superior' : 'inferior',
    side: quadrant === 1 || quadrant === 4 ? 'direito' : 'esquerdo',
    name: (deciduous ? DECIDUOUS_NAMES : PERMANENT_NAMES)[position - 1],
  };
}

/** Ex.: "Incisivo central superior direito". */
export const describeTooth = (t: ToothInfo) => `${t.name} ${t.arch} ${t.side}`;

/** Os 32 dentes permanentes, em ordem de quadrante. */
export const PERMANENT_TEETH: number[] = [1, 2, 3, 4].flatMap(q => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1));
