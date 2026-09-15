import august2026Contract from '../data/power-ranking/2026-08/public-results.json';
import { editorial as augustEditorial } from '../data/power-ranking/2026-08/editorial';
import july2026 from '../data/power-ranking/2026-07/data.json';
import { editorial as julyEditorial } from '../data/power-ranking/2026-07/editorial';
import june2026 from '../data/power-ranking/2026-06/data.json';
import { editorial as juneEditorial } from '../data/power-ranking/2026-06/editorial';
import { loadPublicResultsV1, presentContractMovement } from './public-results-v1.mjs';

export type ProjectId = 'vis-ludica' | 'vis-belica';
export type RankingView = 'power' | 'monthly' | 'analysis' | 'annual';
type ContractMovement = {
  status: 'NEW' | 'RETURNS' | 'UP' | 'DOWN' | 'SAME' | 'OUT';
  previous_position: number | null;
  position_delta: number | null;
};

const august2026 = loadPublicResultsV1(august2026Contract);

export const editions = [
  {
    ...august2026,
    editorial: augustEditorial,
    downloads: {
      'vis-ludica': '/downloads/power-ranking/power_ranking_agosto_2026_revisado.xlsx',
      'vis-belica': '/downloads/power-ranking/power_ranking_vis_belica_agosto_2026_revisado.xlsx',
    },
  },
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

export function formatIndex(value: number | string) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value) * 100);
}

export function formatAnnual(value: number | string) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

export function formatMovement(value: number | string | ContractMovement | null) {
  if (value && typeof value === 'object') {
    return presentContractMovement(value);
  }
  if (value === 'NEW') return { label: 'NEW', tone: 'new' };
  if (!value) return { label: '—', tone: 'same' };
  if (typeof value === 'number' && value > 0) return { label: `+${value}`, tone: 'up' };
  return { label: String(value), tone: 'down' };
}

// Un NEW es reentrada (no novedad) si el juego ya tenía puntuación en algún
// mes anterior al de la edición. Los índices previos a `editionMonth` son
// 0 .. editionMonth-2 (editionMonth es 1-indexado: Ene = 1).
function isReentry(project: any, gameId: string, editionMonth: number) {
  const history = project.games?.[gameId]?.history as Array<number | null> | undefined;
  if (!history) return false;
  return history.slice(0, Math.max(0, editionMonth - 1)).some((value) => value !== null);
}

// Resuelve el pill de movimiento aplicando las reglas de presentación:
// NEW → "Vuelve" si hay historia previa, y silencia los movimientos
// numéricos en la cola (rank > 50) de power/annual (no en monthly).
export function resolveMovement(
  project: any,
  view: Exclude<RankingView, 'analysis'>,
  row: { id: string; rank: number; movement: number | string | ContractMovement | null },
  editionMonth: number,
) {
  // public-results-v1 ya clasifica NEW frente a RETURNS y calcula deltas.
  // No se consulta el histórico ni se vuelve a comparar ningún ranking.
  if (row.movement && typeof row.movement === 'object') return formatMovement(row.movement);
  if (row.movement === 'NEW' && isReentry(project, row.id, editionMonth)) {
    return { label: 'Vuelve', tone: 'new' };
  }
  if ((view === 'power' || view === 'annual') && row.rank > 50 && typeof row.movement === 'number') {
    return { label: '—', tone: 'same' };
  }
  return formatMovement(row.movement);
}

// Formatea una fila de ranking exactamente como se pinta en la tabla: texto
// ya listo para insertar, sin que el cliente tenga que reimplementar reglas.
// Usada tanto por el componente Astro (filas estáticas) como por el
// endpoint datos.json (filas bajo demanda) — una sola implementación.
export function presentRow(
  project: any,
  view: Exclude<RankingView, 'analysis'>,
  row: any,
  editionMonth: number,
) {
  const title = row.title ?? gameTitle(project, row.id);
  const movement = resolveMovement(project, view, row, editionMonth);

  if (view === 'monthly') {
    return {
      rank: row.rank,
      title,
      points: String(row.points),
      detail: `${row.firstVotes}–${row.secondVotes}–${row.thirdVotes}`,
      votes: String(row.votes),
      movement,
    };
  }

  if (view === 'annual') {
    return {
      rank: row.rank,
      title,
      score: formatAnnual(row.score),
      months: String(row.months),
      movement,
    };
  }

  return {
    rank: row.rank,
    title,
    score: formatIndex(row.score),
    movement,
  };
}

export function monthsForGame(history: Array<number | string | null>, throughMonth: number) {
  return history
    .slice(Math.max(0, throughMonth - 4), throughMonth)
    .map((value, index) => ({
      label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][Math.max(0, throughMonth - 4) + index],
      value,
    }));
}
