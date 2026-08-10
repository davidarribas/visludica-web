#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { XMLParser } from 'fast-xml-parser';

const execFileAsync = promisify(execFile);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false });
const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node['#text'] != null) return String(node['#text']);
  if (node.t != null) return textValue(node.t);
  if (node.r != null) return asArray(node.r).map((part) => textValue(part.t)).join('');
  return '';
}

async function unzipEntry(file, entry, optional = false) {
  try {
    const { stdout } = await execFileAsync('unzip', ['-p', file, entry], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    if (optional) return '';
    throw new Error(`No se pudo leer ${entry} de ${path.basename(file)}: ${error.message}`);
  }
}

function columnIndex(address) {
  const letters = address.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A';
  return [...letters].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function cellValue(cell, sharedStrings) {
  const type = cell['@_t'];
  if (type === 'inlineStr') return textValue(cell.is);
  const raw = cell.v;
  if (raw == null) return null;
  if (type === 's') return sharedStrings[Number(raw)] ?? '';
  if (type === 'str') return String(raw);
  if (type === 'b') return String(raw) === '1';
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : String(raw);
}

async function readWorkbook(file) {
  const [workbookXml, relationshipsXml, sharedXml] = await Promise.all([
    unzipEntry(file, 'xl/workbook.xml'),
    unzipEntry(file, 'xl/_rels/workbook.xml.rels'),
    unzipEntry(file, 'xl/sharedStrings.xml', true),
  ]);
  const workbook = parser.parse(workbookXml).workbook;
  const relationships = asArray(parser.parse(relationshipsXml).Relationships.Relationship);
  const targets = new Map(relationships.map((item) => [item['@_Id'], item['@_Target']]));
  const sharedStrings = sharedXml
    ? asArray(parser.parse(sharedXml).sst.si).map((item) => textValue(item))
    : [];
  const sheets = new Map();

  for (const sheet of asArray(workbook.sheets.sheet)) {
    const target = targets.get(sheet['@_r:id']);
    if (!target) throw new Error(`No se encontró el XML de la hoja ${sheet['@_name']}`);
    const entry = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const xml = parser.parse(await unzipEntry(file, entry)).worksheet;
    const rows = [];
    for (const row of asArray(xml.sheetData?.row)) {
      const rowIndex = Number(row['@_r'] ?? rows.length + 1) - 1;
      const values = [];
      for (const cell of asArray(row.c)) {
        values[columnIndex(cell['@_r'])] = cellValue(cell, sharedStrings);
      }
      rows[rowIndex] = values;
    }
    sheets.set(sheet['@_name'], { name: sheet['@_name'], rows });
  }
  return { file, sheets };
}

function number(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value) {
  const parsed = number(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function compact(value, digits = 6) {
  if (value == null) return null;
  return Number(value.toFixed(digits));
}

function normalizeTitle(value) {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ª', 'a')
    .replaceAll('º', 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeTitle(value).replaceAll(' ', '-') || 'juego';
}

function findSheet(workbook, pattern) {
  for (const sheet of workbook.sheets.values()) {
    if (pattern.test(sheet.name)) return sheet;
  }
  throw new Error(`No se encontró una hoja que coincida con ${pattern}`);
}

function findHeader(sheet, required) {
  const wanted = required.map((item) => item.toLocaleLowerCase('es'));
  for (let rowIndex = 0; rowIndex < Math.min(sheet.rows.length, 15); rowIndex += 1) {
    const headers = new Map();
    for (const [column, raw] of (sheet.rows[rowIndex] ?? []).entries()) {
      if (raw != null) headers.set(String(raw).trim().toLocaleLowerCase('es'), column);
    }
    if (wanted.every((item) => headers.has(item))) return { rowIndex, headers };
  }
  throw new Error(`No se encontró la cabecera ${required.join(', ')} en ${sheet.name}`);
}

function byAlias(row, headers, ...aliases) {
  for (const alias of aliases) {
    const column = headers.get(alias.toLocaleLowerCase('es'));
    if (column != null) return row[column];
  }
  return null;
}

function parseMovement(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (text.toUpperCase() === 'NEW') return 'NEW';
  if (['=', '0', '+0', '-0'].includes(text)) return 0;
  const match = text.match(/[-+]?\d+/);
  return match ? Number(match[0]) : null;
}

function parseMonthly(sheet) {
  const { rowIndex, headers } = findHeader(sheet, ['Pos', 'Juego']);
  const results = [];
  for (const row of sheet.rows.slice(rowIndex + 1)) {
    if (!row) continue;
    const title = byAlias(row, headers, 'Juego');
    const rank = integer(byAlias(row, headers, 'Pos'));
    if (!title || rank == null) continue;
    results.push({
      id: slugify(String(title)),
      title: String(title).trim(),
      rank,
      points: integer(byAlias(row, headers, 'Pts')) ?? 0,
      normalized: compact(number(byAlias(row, headers, 'Norm.', 'Norm'))),
      firstVotes: integer(byAlias(row, headers, 'Nº1')) ?? 0,
      secondVotes: integer(byAlias(row, headers, 'Nº2')) ?? 0,
      thirdVotes: integer(byAlias(row, headers, 'Nº3')) ?? 0,
      votes: integer(byAlias(row, headers, 'Votos')) ?? 0,
      movement: parseMovement(byAlias(row, headers, 'Var.')),
    });
  }
  return results.sort((a, b) => a.rank - b.rank);
}

function parsePower(sheet) {
  const { rowIndex, headers } = findHeader(sheet, ['Pos', 'Juego', 'Score']);
  const results = [];
  for (const row of sheet.rows.slice(rowIndex + 1)) {
    if (!row) continue;
    const title = byAlias(row, headers, 'Juego');
    const rank = integer(byAlias(row, headers, 'Pos'));
    const score = number(byAlias(row, headers, 'Score'));
    if (!title || rank == null || score == null) continue;
    results.push({ id: slugify(String(title)), title: String(title).trim(), rank, score: compact(score) });
  }
  return results.sort((a, b) => a.rank - b.rank);
}

function parseHistory(sheet) {
  const { rowIndex, headers } = findHeader(sheet, ['Juego', 'POWER', 'PALMARÉS']);
  const monthColumns = monthLabels.map((label) => headers.get(label.toLocaleLowerCase('es')));
  const games = {};
  let voterHistory = [];
  for (const row of sheet.rows.slice(rowIndex + 1)) {
    if (!row) continue;
    const rawTitle = row[headers.get('juego')];
    if (!rawTitle) continue;
    const title = String(rawTitle).trim();
    const history = monthColumns.map((column) => compact(number(column == null ? null : row[column])));
    if (['votantes', 'votos de guerra'].includes(normalizeTitle(title))) {
      voterHistory = history
        .map((value, index) => ({ month: index + 1, label: monthLabels[index], value: integer(value) }))
        .filter((item) => item.value != null);
      continue;
    }
    const id = slugify(title);
    if (games[id]) {
      games[id].history = games[id].history.map((value, index) => {
        const next = history[index];
        return value == null && next == null ? null : compact(Math.max(value ?? 0, next ?? 0));
      });
    } else {
      games[id] = { id, title, history };
    }
  }
  return { games, voterHistory };
}

function powerScore(history, month) {
  const index = month - 1;
  const current = history[index] ?? 0;
  const previous = [1, 2, 3].map((offset) => (index - offset >= 0 ? history[index - offset] ?? 0 : 0));
  return 0.7 * current + 0.3 * (0.5 * previous[0] + 0.3 * previous[1] + 0.2 * previous[2]);
}

function rankedScores(games, month, mode) {
  const current = [];
  const previous = [];
  for (const [id, game] of Object.entries(games)) {
    const score = mode === 'power'
      ? powerScore(game.history, month)
      : game.history.slice(0, month).reduce((sum, value) => sum + (value ?? 0), 0);
    const previousScore = mode === 'power'
      ? (month > 1 ? powerScore(game.history, month - 1) : 0)
      : game.history.slice(0, Math.max(0, month - 1)).reduce((sum, value) => sum + (value ?? 0), 0);
    if (score > 0) current.push([id, score]);
    if (previousScore > 0) previous.push([id, previousScore]);
  }
  const sorter = (a, b) => b[1] - a[1] || games[a[0]].title.localeCompare(games[b[0]].title, 'es');
  current.sort(sorter);
  previous.sort(sorter);
  const previousRanks = new Map(previous.map(([id], index) => [id, index + 1]));
  return current.map(([id, score], index) => {
    const rank = index + 1;
    const previousRank = previousRanks.get(id);
    const item = { id, rank, score: compact(score), movement: previousRank == null ? 'NEW' : previousRank - rank };
    if (mode === 'annual') item.months = games[id].history.slice(0, month).filter((value) => value != null).length;
    return item;
  });
}

function statsFromMain(sheet, monthly) {
  const values = new Map();
  for (const row of sheet.rows.slice(0, 5)) {
    for (let index = 0; index < (row?.length ?? 0) - 1; index += 1) {
      if (typeof row[index] !== 'string') continue;
      const key = row[index].trim().toLocaleLowerCase('es').replace(/:$/, '');
      const parsed = integer(row[index + 1]);
      if (parsed != null) values.set(key, parsed);
    }
  }
  return {
    voters: values.get('votantes') ?? 0,
    distinctGames: values.get('juegos distintos') ?? monthly.length,
    totalPoints: values.get('puntos totales') ?? monthly.reduce((sum, item) => sum + item.points, 0),
  };
}

function projectPayload(workbook, projectId, month) {
  const monthName = monthNames[month - 1];
  const monthlySheet = projectId === 'vis-ludica'
    ? findSheet(workbook, new RegExp(`^Ranking\\s+${monthName}\\s+\\d{4}$`, 'i'))
    : findSheet(workbook, new RegExp(`^Ranking\\s+Vis\\s+Bélica\\s+${monthName}$`, 'i'));
  const powerSheet = projectId === 'vis-ludica'
    ? findSheet(workbook, new RegExp(`^Power\\s+Ranking\\s+${monthName}$`, 'i'))
    : findSheet(workbook, new RegExp(`^Power\\s+Ranking\\s+Vis\\s+Bélica\\s+${monthName}$`, 'i'));
  const historySheet = projectId === 'vis-ludica'
    ? findSheet(workbook, /^Histórico\s+\d{4}$/i)
    : findSheet(workbook, /^Histórico\s+Vis\s+Bélica$/i);

  const monthly = parseMonthly(monthlySheet);
  const power = parsePower(powerSheet);
  const { games, voterHistory } = parseHistory(historySheet);
  for (const item of [...monthly, ...power]) {
    games[item.id] ??= { id: item.id, title: item.title, history: Array(12).fill(null) };
    games[item.id].title = item.title;
  }

  let previousRanks = new Map();
  if (month > 1) {
    const previousName = monthNames[month - 2];
    const pattern = projectId === 'vis-ludica'
      ? new RegExp(`^Power\\s+Ranking\\s+${previousName}$`, 'i')
      : new RegExp(`^Power\\s+Ranking\\s+Vis\\s+Bélica\\s+${previousName}$`, 'i');
    try {
      previousRanks = new Map(parsePower(findSheet(workbook, pattern)).map((item) => [item.id, item.rank]));
    } catch {
      previousRanks = new Map(rankedScores(games, month - 1, 'power').map((item) => [item.id, item.rank]));
    }
  }
  for (const item of power) {
    const previousRank = previousRanks.get(item.id);
    item.movement = previousRank == null ? 'NEW' : previousRank - item.rank;
    delete item.title;
  }

  const stats = projectId === 'vis-ludica'
    ? statsFromMain(monthlySheet, monthly)
    : {
        voters: voterHistory.find((item) => item.month === month)?.value ?? 0,
        distinctGames: monthly.length,
        totalPoints: monthly.reduce((sum, item) => sum + item.points, 0),
      };

  return {
    id: projectId,
    stats,
    voterHistory,
    games,
    rankings: { power, monthly, annual: rankedScores(games, month, 'annual') },
  };
}

function validateProject(project) {
  for (const view of ['power', 'monthly', 'annual']) {
    const ranks = project.rankings[view].map((item) => item.rank);
    if (!ranks.every((rank, index) => rank === index + 1)) throw new Error(`Posiciones no consecutivas en ${project.id} / ${view}`);
  }
  if (!project.rankings.power.length || !project.rankings.monthly.length) throw new Error(`No hay resultados para ${project.id}`);
  const points = project.rankings.monthly.reduce((sum, item) => sum + item.points, 0);
  if (points !== project.stats.totalPoints) throw new Error(`Los puntos de ${project.id} no cuadran: ${points} frente a ${project.stats.totalPoints}`);
  if (project.stats.voters <= 0) throw new Error(`El número de votantes no es válido en ${project.id}`);
}

function cliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, '');
    const value = argv[index + 1];
    if (!key || value == null) throw new Error(`Argumento incompleto: ${argv[index] ?? ''}`);
    args[key] = value;
  }
  for (const key of ['main', 'belica', 'year', 'month']) {
    if (!args[key]) throw new Error(`Falta --${key}`);
  }
  return args;
}

const args = cliArgs(process.argv.slice(2));
const year = Number(args.year);
const month = Number(args.month);
if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Año o mes no válidos');

const [mainWorkbook, belicaWorkbook] = await Promise.all([readWorkbook(args.main), readWorkbook(args.belica)]);
const projects = {
  'vis-ludica': projectPayload(mainWorkbook, 'vis-ludica', month),
  'vis-belica': projectPayload(belicaWorkbook, 'vis-belica', month),
};
Object.values(projects).forEach(validateProject);

const editionId = `${year}-${String(month).padStart(2, '0')}`;
const output = args.output ?? `src/data/power-ranking/${editionId}/data.json`;
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify({
  id: editionId,
  year,
  month,
  monthName: monthNames[month - 1][0].toUpperCase() + monthNames[month - 1].slice(1),
  sourceFiles: {
    'vis-ludica': path.basename(args.main),
    'vis-belica': path.basename(args.belica),
  },
  projects,
}, null, 2)}\n`);

for (const project of Object.values(projects)) {
  const powerLeader = project.games[project.rankings.power[0].id].title;
  const monthLeader = project.rankings.monthly[0].title;
  console.log(`${project.id}: Power ${powerLeader} · Mes ${monthLeader} · ${project.stats.voters} votantes`);
}
console.log(`Generado ${output}`);
