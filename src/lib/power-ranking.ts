import july2026 from '../data/power-ranking/2026-07/data.json';
import { editorial as julyEditorial } from '../data/power-ranking/2026-07/editorial';
import june2026 from '../data/power-ranking/2026-06/data.json';
import { editorial as juneEditorial } from '../data/power-ranking/2026-06/editorial';

export type ProjectId = 'vis-ludica' | 'vis-belica';
export type RankingView = 'power' | 'monthly' | 'annual';

export const editions = [
  {
    ...july2026,
    editorial: julyEditorial,
  },
  {
    ...june2026,
    editorial: juneEditorial,
  },
];

export const latestEdition = editions[0];

export function getEdition(year: number, month: number) {
  return editions.find((edition) => edition.year === year && edition.month === month);
}

export function gameTitle(project: any, gameId: string) {
  return project.games[gameId]?.title ?? gameId;
}

export function formatIndex(value: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value * 100);
}

export function formatMovement(value: number | string | null) {
  if (value === 'NEW') return { label: 'NEW', tone: 'new' };
  if (!value) return { label: '—', tone: 'same' };
  if (typeof value === 'number' && value > 0) return { label: `+${value}`, tone: 'up' };
  return { label: String(value), tone: 'down' };
}

export function monthsForGame(history: Array<number | null>, throughMonth: number) {
  return history
    .slice(Math.max(0, throughMonth - 4), throughMonth)
    .map((value, index) => ({
      label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][Math.max(0, throughMonth - 4) + index],
      value,
    }));
}
