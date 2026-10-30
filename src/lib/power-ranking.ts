import { loadPublicResultsV1, presentContractMovement } from './public-results-v1.mjs';

export type ProjectId = 'vis-ludica' | 'vis-belica';
export type RankingView = 'power' | 'monthly' | 'analysis' | 'annual';
type ContractMovement = {
  status: 'NEW' | 'RETURNS' | 'UP' | 'DOWN' | 'SAME' | 'OUT';
  previous_position: number | null;
  position_delta: number | null;
};

const PROJECT_IDS: ProjectId[] = ['vis-ludica', 'vis-belica'];

// Las ediciones se descubren solas: una carpeta `YYYY-MM` por edición bajo
// src/data/power-ranking/. No hay registro que mantener ni orden que respetar
// —se ordenan por id descendente, así que `latestEdition` es siempre la más
// reciente—. Qué se lee de cada carpeta:
//
//   public-results.json  datos autoritativos del motor (public-results-v1)
//   data.json            datos legacy; solo se usa si no hay contrato
//   editorial.ts         textos de la edición (obligatorio)
//   downloads.ts         rutas públicas de los XLSX (opcional)
//
// Una carpeta incompleta rompe el build con un mensaje que la nombra; lo que
// no se quiere es publicar un mes a medias en silencio.
const contracts = import.meta.glob<any>('../data/power-ranking/*/public-results.json', {
  eager: true,
  import: 'default',
});
const legacyData = import.meta.glob<any>('../data/power-ranking/*/data.json', {
  eager: true,
  import: 'default',
});
const editorials = import.meta.glob<any>('../data/power-ranking/*/editorial.ts', {
  eager: true,
  import: 'editorial',
});
const editionDownloads = import.meta.glob<any>('../data/power-ranking/*/downloads.ts', {
  eager: true,
  import: 'downloads',
});

function editionIdFromPath(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 2];
}

function fail(editionId: string, problem: string): never {
  throw new Error(
    `Power Ranking · edición «${editionId}»: ${problem}. ` +
      `Revisa src/data/power-ranking/${editionId}/ (runbook en docs/power-ranking.md).`,
  );
}

function buildEdition(editionId: string) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(editionId)) {
    fail(editionId, 'el nombre de la carpeta no es YYYY-MM');
  }

  const folder = `../data/power-ranking/${editionId}`;
  const contract = contracts[`${folder}/public-results.json`];
  const legacy = legacyData[`${folder}/data.json`];
  const editorial = editorials[`${folder}/editorial.ts`];
  const downloads = editionDownloads[`${folder}/downloads.ts`];

  if (!contract && !legacy) {
    fail(editionId, 'falta public-results.json (o data.json en las ediciones legacy)');
  }
  if (!editorial) fail(editionId, 'falta editorial.ts');
  for (const projectId of PROJECT_IDS) {
    if (!editorial[projectId]) fail(editionId, `editorial.ts no trae los textos de «${projectId}»`);
  }

  // El contrato del motor manda. `data.json` solo sirve a las ediciones
  // anteriores a public-results-v1, que nunca tuvieron artefacto.
  const data = contract ? loadPublicResultsV1(contract) : legacy;

  if (data.id !== editionId) {
    fail(editionId, `los datos dicen ser de la edición «${data.id}»`);
  }

  return { ...data, editorial, ...(downloads ? { downloads } : {}) };
}

function discoverEditionIds() {
  const ids = new Set<string>();
  for (const source of [contracts, legacyData, editorials, editionDownloads]) {
    for (const path of Object.keys(source)) ids.add(editionIdFromPath(path));
  }
  // Orden descendente: los ids YYYY-MM se comparan bien como texto.
  return [...ids].sort().reverse();
}

const editionIds = discoverEditionIds();

if (editionIds.length === 0) {
  throw new Error(
    'Power Ranking: no hay ninguna edición en src/data/power-ranking/ ' +
      '(se espera una carpeta YYYY-MM por edición; runbook en docs/power-ranking.md).',
  );
}

export const editions = editionIds.map(buildEdition);

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
