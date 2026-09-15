import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadPublicResultsV1, presentContractMovement, validatePublicResultsV1 } from '../src/lib/public-results-v1.mjs';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const contractPath = join(root, 'src/data/power-ranking/2026-08/public-results.json');
const raw = JSON.parse(await readFile(contractPath, 'utf8'));
const august = loadPublicResultsV1(raw);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function positions(rows) {
  return rows.map(({ rank, id }) => ({ position: rank, game_id: id }));
}

test('carga public-results-v1 y conserva las posiciones y el orden del motor', () => {
  assert.equal(august.schemaVersion, 'public-results-v1');
  for (const projectId of ['vis-ludica', 'vis-belica']) {
    const source = raw.projects[projectId];
    const project = august.projects[projectId];
    assert.deepEqual(positions(project.rankings.monthly), source.monthly_ranking.map(({ position, game_id }) => ({ position, game_id })));
    assert.deepEqual(positions(project.rankings.power), source.power_ranking.map(({ position, game_id }) => ({ position, game_id })));
    assert.deepEqual(positions(project.rankings.annual), source.annual_ranking.map(({ position, game_id }) => ({ position, game_id })));
  }
});

test('rechaza una versión desconocida y campos autoritativos ausentes o mal tipados', () => {
  const unknownVersion = clone(raw);
  unknownVersion.schema_version = 'public-results-v2';
  assert.throws(() => validatePublicResultsV1(unknownVersion), /versión desconocida/);

  const missingPower = clone(raw);
  delete missingPower.projects['vis-ludica'].power_ranking[0].power;
  assert.throws(() => loadPublicResultsV1(missingPower), /falta power/);

  const missingPosition = clone(raw);
  delete missingPosition.projects['vis-ludica'].annual_ranking[0].position;
  assert.throws(() => loadPublicResultsV1(missingPosition), /falta position/);

  const numericDecimal = clone(raw);
  numericDecimal.projects['vis-ludica'].power_ranking[0].power = 0.2168;
  assert.throws(() => loadPublicResultsV1(numericDecimal), /texto inválido/);
});

test('agosto general conserva los controles exactos del contrato', () => {
  const project = august.projects['vis-ludica'];
  assert.deepEqual(project.stats, { voters: 181, distinctGames: 322, totalPoints: 1082 });
  assert.equal(raw.projects['vis-ludica'].power_ranking[0].power, '0.216800');
  assert.equal(project.rankings.power[0].score, '0.216800');
  assert.equal(raw.projects['vis-ludica'].annual_ranking[0].annual, '1.282');
  assert.equal(project.rankings.annual[0].score, '1.282');
});

test('agosto Vis Bélica conserva los controles exactos del contrato', () => {
  const project = august.projects['vis-belica'];
  assert.deepEqual(project.stats, { voters: 63, distinctGames: 73, totalPoints: 235 });
  assert.equal(raw.projects['vis-belica'].power_ranking[0].power, '0.386810');
  assert.equal(project.rankings.power[0].score, '0.386810');
  assert.equal(raw.projects['vis-belica'].annual_ranking[0].annual, '3.681');
  assert.equal(project.rankings.annual[0].score, '3.681');
});

test('los empates y todos los movimientos proceden directamente del contrato', () => {
  const project = august.projects['vis-belica'];
  const tie = raw.projects['vis-belica'].tie_groups.find((group) => group.position === 16);
  assert.deepEqual(project.tieGroups.find((group) => group.position === 16), { position: 16, gameIds: tie.game_ids });
  const annualTie = raw.projects['vis-belica'].tie_groups.find((group) => group.position === 88);
  assert.equal(project.rankings.annual.filter((row) => row.rank === 88).length, annualTie.game_ids.length, 'el empate conserva la misma posición compartida');

  const statuses = new Set(project.rankings.monthly.map((row) => row.movement.status));
  for (const status of ['NEW', 'RETURNS', 'UP', 'DOWN', 'SAME']) assert.ok(statuses.has(status), `falta ${status}`);
  assert.equal(project.departures[0].movement.status, 'OUT');
  assert.equal(project.departures[0].id, raw.projects['vis-belica'].departures[0].game_id);

  assert.deepEqual(presentContractMovement(project.rankings.monthly.find((row) => row.movement.status === 'NEW').movement), { label: 'Nuevo', tone: 'new' });
  assert.deepEqual(presentContractMovement(project.rankings.monthly.find((row) => row.movement.status === 'RETURNS').movement), { label: 'Vuelve', tone: 'new' });
  const up = project.rankings.monthly.find((row) => row.movement.status === 'UP').movement;
  const down = project.rankings.monthly.find((row) => row.movement.status === 'DOWN').movement;
  assert.deepEqual(presentContractMovement(up), { label: `+${up.position_delta}`, tone: 'up' });
  assert.deepEqual(presentContractMovement(down), { label: String(down.position_delta), tone: 'down' });
  assert.deepEqual(presentContractMovement(project.rankings.monthly.find((row) => row.movement.status === 'SAME').movement), { label: '=', tone: 'same' });
  assert.deepEqual(presentContractMovement(project.departures[0].movement), { label: 'Sale', tone: 'down' });
});

test('el artefacto de agosto no incorpora campos privados', () => {
  const forbidden = new Set(['comments', 'comment', 'nickname', 'voter', 'response_id', 'ballots', 'participant_id', 'snapshots']);
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert.ok(!forbidden.has(key), `campo privado publicado: ${key}`);
        walk(child);
      }
    }
  };
  walk(raw);
});

test('un contrato v1 inválido falla sin caer a XLSX y las ediciones legacy siguen declaradas', async () => {
  const invalid = clone(raw);
  delete invalid.projects['vis-belica'].stats.total_points;
  assert.throws(() => loadPublicResultsV1(invalid), /falta total_points/);

  const source = await readFile(join(root, 'src/lib/power-ranking.ts'), 'utf8');
  assert.match(source, /loadPublicResultsV1\(august2026Contract\)/);
  assert.doesNotMatch(source, /2026-08\/data\.json/);
  assert.match(source, /july2026/);
  assert.match(source, /june2026/);
});
