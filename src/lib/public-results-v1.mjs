const DECIMAL = /^-?(0|[1-9][0-9]*)\.[0-9]+$/;
const PERIOD = /^[0-9]{4}-[0-9]{2}$/;
const GAME_ID = /^vlg_[0-9]{6}$/;
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Falla pronto: una edición declarada v1 nunca debe pasar por el importador XLSX. */
function invalid(path, message) {
  throw new Error(`public-results-v1 inválido en ${path}: ${message}`);
}

function object(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(path, 'debe ser un objeto');
  return value;
}

function exactKeys(value, path, keys) {
  object(value, path);
  for (const key of keys) if (!(key in value)) invalid(path, `falta ${key}`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) invalid(path, `campo no permitido: ${key}`);
  return value;
}

function string(value, path, pattern) {
  if (typeof value !== 'string' || (pattern && !pattern.test(value))) invalid(path, 'texto inválido');
}

function nonEmptyString(value, path) {
  string(value, path);
  if (value.length === 0) invalid(path, 'texto no vacío requerido');
}

function integer(value, path, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) invalid(path, `entero >= ${minimum} requerido`);
}

function decimal(value, path) {
  string(value, path, DECIMAL);
}

function nullableInteger(value, path, minimum = 1) {
  if (value !== null) integer(value, path, minimum);
}

function array(value, path) {
  if (!Array.isArray(value)) invalid(path, 'debe ser un array');
  return value;
}

function nonEmptyArray(value, path) {
  const values = array(value, path);
  if (values.length === 0) invalid(path, 'requiere al menos un elemento');
  return values;
}

function movement(value, path, departure = false) {
  exactKeys(value, path, ['status', 'previous_position', 'position_delta']);
  const allowed = departure ? ['OUT'] : ['NEW', 'RETURNS', 'UP', 'DOWN', 'SAME'];
  if (!allowed.includes(value.status)) invalid(`${path}.status`, 'estado no permitido');
  if (departure) integer(value.previous_position, `${path}.previous_position`, 1);
  else nullableInteger(value.previous_position, `${path}.previous_position`);
  nullableInteger(value.position_delta, `${path}.position_delta`, -Number.MAX_SAFE_INTEGER);
}

function gameId(value, path) {
  string(value, path, GAME_ID);
}

function stats(value, path) {
  exactKeys(value, path, ['valid_voters', 'distinct_games', 'total_points', 'games_with_n1', 'games_with_one_voter', 'excluded_positions', 'discarded_ballots']);
  for (const key of Object.keys(value)) integer(value[key], `${path}.${key}`);
}

function voterHistoryItem(value, path) {
  exactKeys(value, path, ['period_id', 'valid_voters', 'distinct_games', 'total_points']);
  string(value.period_id, `${path}.period_id`, PERIOD);
  for (const key of ['valid_voters', 'distinct_games', 'total_points']) integer(value[key], `${path}.${key}`);
}

function baseRankRow(value, path, periodRequired = false) {
  const keys = periodRequired
    ? ['period_id', 'position', 'game_id', 'points', 'normalized', 'n1', 'n2', 'n3', 'voters']
    : ['position', 'game_id', 'points', 'normalized', 'n1', 'n2', 'n3', 'voters'];
  exactKeys(value, path, keys);
  if (periodRequired) string(value.period_id, `${path}.period_id`, PERIOD);
  integer(value.position, `${path}.position`, 1);
  gameId(value.game_id, `${path}.game_id`);
  for (const key of ['points', 'n1', 'n2', 'n3', 'voters']) integer(value[key], `${path}.${key}`);
  decimal(value.normalized, `${path}.normalized`);
}

function monthlyRow(value, path) {
  baseRankRow(value, path);
  // baseRankRow deliberately validates exact keys before movement is required.
}

function validateProject(project, projectId, path) {
  exactKeys(project, path, [
    'project_id', 'display_name', 'stats', 'voter_history', 'games', 'history',
    'monthly_ranking', 'power_ranking', 'annual_ranking', 'departures',
    'power_departures', 'annual_departures', 'tie_groups',
  ]);
  string(project.project_id, `${path}.project_id`);
  if (project.project_id !== projectId) invalid(`${path}.project_id`, 'no coincide con su clave de proyecto');
  nonEmptyString(project.display_name, `${path}.display_name`);
  stats(project.stats, `${path}.stats`);

  array(project.voter_history, `${path}.voter_history`).forEach((item, index) => voterHistoryItem(item, `${path}.voter_history[${index}]`));
  const gameIds = new Set();
  array(project.games, `${path}.games`).forEach((game, index) => {
    exactKeys(game, `${path}.games[${index}]`, ['game_id', 'display_name']);
    gameId(game.game_id, `${path}.games[${index}].game_id`);
    nonEmptyString(game.display_name, `${path}.games[${index}].display_name`);
    if (gameIds.has(game.game_id)) invalid(`${path}.games[${index}].game_id`, 'game_id duplicado');
    gameIds.add(game.game_id);
  });

  array(project.history, `${path}.history`).forEach((row, index) => {
    baseRankRow(row, `${path}.history[${index}]`, true);
    if (!gameIds.has(row.game_id)) invalid(`${path}.history[${index}].game_id`, 'juego no declarado');
  });
  nonEmptyArray(project.monthly_ranking, `${path}.monthly_ranking`).forEach((row, index) => {
    exactKeys(row, `${path}.monthly_ranking[${index}]`, ['position', 'game_id', 'points', 'normalized', 'n1', 'n2', 'n3', 'voters', 'movement']);
    integer(row.position, `${path}.monthly_ranking[${index}].position`, 1);
    gameId(row.game_id, `${path}.monthly_ranking[${index}].game_id`);
    for (const key of ['points', 'n1', 'n2', 'n3', 'voters']) integer(row[key], `${path}.monthly_ranking[${index}].${key}`);
    decimal(row.normalized, `${path}.monthly_ranking[${index}].normalized`);
    movement(row.movement, `${path}.monthly_ranking[${index}].movement`);
    if (!gameIds.has(row.game_id)) invalid(`${path}.monthly_ranking[${index}].game_id`, 'juego no declarado');
  });
  nonEmptyArray(project.power_ranking, `${path}.power_ranking`).forEach((row, index) => {
    exactKeys(row, `${path}.power_ranking[${index}]`, ['position', 'game_id', 'power', 'window', 'movement']);
    integer(row.position, `${path}.power_ranking[${index}].position`, 1);
    gameId(row.game_id, `${path}.power_ranking[${index}].game_id`);
    decimal(row.power, `${path}.power_ranking[${index}].power`);
    exactKeys(row.window, `${path}.power_ranking[${index}].window`, ['current', 'm1', 'm2', 'm3']);
    for (const key of ['current', 'm1', 'm2', 'm3']) decimal(row.window[key], `${path}.power_ranking[${index}].window.${key}`);
    movement(row.movement, `${path}.power_ranking[${index}].movement`);
    if (!gameIds.has(row.game_id)) invalid(`${path}.power_ranking[${index}].game_id`, 'juego no declarado');
  });
  nonEmptyArray(project.annual_ranking, `${path}.annual_ranking`).forEach((row, index) => {
    exactKeys(row, `${path}.annual_ranking[${index}]`, ['position', 'game_id', 'annual', 'months_present', 'top3_months', 'n1_total', 'movement']);
    integer(row.position, `${path}.annual_ranking[${index}].position`, 1);
    gameId(row.game_id, `${path}.annual_ranking[${index}].game_id`);
    decimal(row.annual, `${path}.annual_ranking[${index}].annual`);
    for (const key of ['months_present', 'top3_months', 'n1_total']) integer(row[key], `${path}.annual_ranking[${index}].${key}`);
    movement(row.movement, `${path}.annual_ranking[${index}].movement`);
    if (!gameIds.has(row.game_id)) invalid(`${path}.annual_ranking[${index}].game_id`, 'juego no declarado');
  });
  for (const field of ['departures', 'power_departures', 'annual_departures']) {
    array(project[field], `${path}.${field}`).forEach((row, index) => {
      exactKeys(row, `${path}.${field}[${index}]`, ['game_id', 'movement']);
      gameId(row.game_id, `${path}.${field}[${index}].game_id`);
      movement(row.movement, `${path}.${field}[${index}].movement`, true);
      if (!gameIds.has(row.game_id)) invalid(`${path}.${field}[${index}].game_id`, 'juego no declarado');
    });
  }
  array(project.tie_groups, `${path}.tie_groups`).forEach((group, index) => {
    exactKeys(group, `${path}.tie_groups[${index}]`, ['position', 'game_ids']);
    integer(group.position, `${path}.tie_groups[${index}].position`, 1);
    if (array(group.game_ids, `${path}.tie_groups[${index}].game_ids`).length < 2) invalid(`${path}.tie_groups[${index}].game_ids`, 'requiere al menos dos juegos');
    group.game_ids.forEach((id, gameIndex) => {
      gameId(id, `${path}.tie_groups[${index}].game_ids[${gameIndex}]`);
      if (!gameIds.has(id)) invalid(`${path}.tie_groups[${index}].game_ids[${gameIndex}]`, 'juego no declarado');
    });
  });
}

/** Valida el contrato completo que consume Astro, sin dependencia de un validador JSON Schema. */
export function validatePublicResultsV1(data) {
  exactKeys(data, '$', ['schema_version', 'period_id', 'generated_at', 'edition', 'provenance', 'projects']);
  if (data.schema_version !== 'public-results-v1') invalid('$.schema_version', 'versión desconocida');
  string(data.period_id, '$.period_id', PERIOD);
  string(data.generated_at, '$.generated_at');
  if (Number.isNaN(Date.parse(data.generated_at)) || !/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(data.generated_at)) invalid('$.generated_at', 'fecha RFC3339 con zona horaria requerida');
  exactKeys(data.edition, '$.edition', ['year', 'month', 'cycle_start_period', 'cycle_end_period']);
  integer(data.edition.year, '$.edition.year', 0);
  integer(data.edition.month, '$.edition.month', 1);
  if (data.edition.month > 12) invalid('$.edition.month', 'mes <= 12 requerido');
  string(data.edition.cycle_start_period, '$.edition.cycle_start_period', PERIOD);
  string(data.edition.cycle_end_period, '$.edition.cycle_end_period', PERIOD);
  exactKeys(data.provenance, '$.provenance', ['engine', 'calculation_status', 'rules_version']);
  if (data.provenance.engine !== 'visludica-power-ranking' || data.provenance.calculation_status !== 'COMPLETE' || data.provenance.rules_version !== 1) invalid('$.provenance', 'provenance incompatible');
  exactKeys(data.projects, '$.projects', ['vis-ludica', 'vis-belica']);
  validateProject(data.projects['vis-ludica'], 'vis-ludica', '$.projects.vis-ludica');
  validateProject(data.projects['vis-belica'], 'vis-belica', '$.projects.vis-belica');
  return data;
}

function adaptProject(project) {
  const games = Object.fromEntries(project.games.map((game) => [game.game_id, { id: game.game_id, title: game.display_name, history: Array(12).fill(null) }]));
  // El histórico se reubica por mes sólo para las tiras y sparklines: no se suma,
  // ordena ni emplea para derivar meses_present o movimientos.
  for (const row of project.history) games[row.game_id].history[Number(row.period_id.slice(5, 7)) - 1] = row.normalized;
  const adaptMovement = (movement) => ({ ...movement });
  return {
    id: project.project_id,
    stats: { voters: project.stats.valid_voters, distinctGames: project.stats.distinct_games, totalPoints: project.stats.total_points },
    voterHistory: project.voter_history.map((item) => ({ month: Number(item.period_id.slice(5, 7)), label: MONTH_LABELS[Number(item.period_id.slice(5, 7)) - 1], value: item.valid_voters })),
    games,
    rankings: {
      monthly: project.monthly_ranking.map((row) => ({ rank: row.position, id: row.game_id, points: row.points, normalized: row.normalized, firstVotes: row.n1, secondVotes: row.n2, thirdVotes: row.n3, votes: row.voters, movement: adaptMovement(row.movement) })),
      power: project.power_ranking.map((row) => ({ rank: row.position, id: row.game_id, score: row.power, window: { ...row.window }, movement: adaptMovement(row.movement) })),
      annual: project.annual_ranking.map((row) => ({ rank: row.position, id: row.game_id, score: row.annual, months: row.months_present, top3Months: row.top3_months, n1Total: row.n1_total, movement: adaptMovement(row.movement) })),
    },
    departures: project.departures.map((row) => ({ id: row.game_id, movement: adaptMovement(row.movement) })),
    powerDepartures: project.power_departures.map((row) => ({ id: row.game_id, movement: adaptMovement(row.movement) })),
    annualDepartures: project.annual_departures.map((row) => ({ id: row.game_id, movement: adaptMovement(row.movement) })),
    tieGroups: project.tie_groups.map((group) => ({ position: group.position, gameIds: [...group.game_ids] })),
  };
}

/** Adaptación determinista de nombres/estructura para los componentes Astro. */
export function loadPublicResultsV1(data) {
  validatePublicResultsV1(data);
  return {
    id: data.period_id,
    schemaVersion: data.schema_version,
    year: data.edition.year,
    month: data.edition.month,
    monthName: MONTH_NAMES[data.edition.month - 1],
    projects: {
      'vis-ludica': adaptProject(data.projects['vis-ludica']),
      'vis-belica': adaptProject(data.projects['vis-belica']),
    },
  };
}

/** Etiquetas de presentación; los estados y deltas siguen siendo los del contrato. */
export function presentContractMovement(movement) {
  if (movement.status === 'NEW') return { label: 'Nuevo', tone: 'new' };
  if (movement.status === 'RETURNS') return { label: 'Vuelve', tone: 'new' };
  if (movement.status === 'SAME') return { label: '=', tone: 'same' };
  if (movement.status === 'OUT') return { label: 'Sale', tone: 'down' };
  if (movement.status === 'UP') return { label: `+${movement.position_delta ?? ''}`, tone: 'up' };
  return { label: String(movement.position_delta ?? '↓'), tone: 'down' };
}
