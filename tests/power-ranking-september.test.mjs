import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { loadPublicResultsV1, validatePublicResultsV1 } from '../src/lib/public-results-v1.mjs';

const root = new URL('../', import.meta.url);
const bytes = await readFile(new URL('src/data/power-ranking/2026-09/public-results.json', root));
const contract = JSON.parse(bytes);
const edition = loadPublicResultsV1(contract);
const execFileAsync = promisify(execFile);

test('septiembre importa el paquete aprobado sin modificar un byte y conserva sus controles', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '456a0f1b6d1ae00632a1d2f48352597b12138ed3b7b8996072eab22ba2d4ad05');
  validatePublicResultsV1(contract);
  assert.deepEqual(edition.projects['vis-ludica'].stats, { voters: 262, distinctGames: 353, totalPoints: 1515 });
  assert.deepEqual(edition.projects['vis-belica'].stats, { voters: 55, distinctGames: 45, totalPoints: 152 });
  for (const [projectId, winner, points] of [['vis-ludica', 'vlg_000830', 74], ['vis-belica', 'vlg_000240', 21]]) {
    const project = edition.projects[projectId];
    assert.equal(project.rankings.monthly[0].points, points);
    for (const view of ['monthly', 'power', 'annual']) assert.equal(project.rankings[view][0].id, winner);
  }
});

test('todos los puestos, empates, valores y movimientos de septiembre proceden del contrato', () => {
  for (const projectId of ['vis-ludica', 'vis-belica']) {
    const source = contract.projects[projectId];
    const project = edition.projects[projectId];
    for (const view of ['monthly', 'power', 'annual']) {
      const rows = source[`${view}_ranking`];
      assert.equal(project.rankings[view].length, rows.length);
      project.rankings[view].forEach((row, index) => {
        const expected = rows[index];
        assert.equal(row.rank, expected.position);
        assert.equal(row.id, expected.game_id);
        assert.deepEqual(row.movement, expected.movement);
        if (view === 'monthly') {
          assert.equal(row.points, expected.points);
          assert.equal(row.normalized, expected.normalized);
          assert.equal(row.votes, expected.voters);
        } else {
          assert.equal(row.score, expected[view === 'power' ? 'power' : 'annual']);
        }
      });
    }
    assert.deepEqual(project.tieGroups, source.tie_groups.map(({ position, game_ids }) => ({ position, gameIds: game_ids })));
  }
});

test('el endpoint de septiembre contiene las tablas completas y las crónicas tienen sus propios paneles', async () => {
  const payload = JSON.parse(await readFile(new URL('dist/power-ranking/2026/09/datos.json', root), 'utf8'));
  const html = await readFile(new URL('dist/power-ranking/2026/09/index.html', root), 'utf8');
  const panels = html.split(/<section[^>]+data-project-panel="/).slice(1);
  for (const projectId of ['vis-ludica', 'vis-belica']) {
    for (const view of ['monthly', 'power', 'annual']) {
      const source = contract.projects[projectId][`${view}_ranking`];
      assert.equal(payload[projectId][view].length, source.length);
      assert.deepEqual(payload[projectId][view].map(row => row.rank), source.map(row => row.position));
    }
    const panel = panels.find(part => part.startsWith(projectId));
    assert.ok(panel, `falta panel ${projectId}`);
    if (projectId === 'vis-ludica') {
      assert.match(panel, /The Elder Scrolls consolida el liderazgo/);
      assert.doesNotMatch(panel, /D-Day at Omaha Beach mantiene el dominio/);
      for (const title of ['Queen Alice', 'Arkham Horror LCG', 'Race for the Galaxy', 'Nippon: Zaibatsu', 'Arcs', 'Unstoppable']) assert.ok(panel.includes(title));
    } else {
      assert.match(panel, /D-Day at Omaha Beach mantiene el dominio/);
      assert.doesNotMatch(panel, /The Elder Scrolls consolida el liderazgo/);
      for (const title of ['Fields of Fire', 'Burning Banners', 'Twilight Struggle', 'Guerra del Anillo', 'Churchill', 'Imperial Struggle', 'El Rey Planeta']) assert.ok(panel.includes(title));
    }
  }
  assert.doesNotMatch(html, /COMENTARIO CANDIDATO|NO PUBLICAR AÚN|campañita|algunos viejunos|ENLACE AL ARTÍCULO|Telegram —/);
});

test('las descargas de septiembre existen y su contenido no expone participación privada', async () => {
  const html = await readFile(new URL('dist/power-ranking/2026/09/index.html', root), 'utf8');
  const links = [...html.matchAll(/href="([^\"]+\.xlsx)"/g)].map(match => match[1]);
  assert.equal(links.length, 2);
  for (const href of links) {
    assert.match(href, /^\/downloads\/power-ranking\/2026-09\/.*_publico\.xlsx$/);
    const file = new URL(`dist${href}`, root);
    const { stdout } = await execFileAsync('unzip', ['-p', file.pathname], { maxBuffer: 20 * 1024 * 1024 });
    assert.doesNotMatch(stdout, /Votos Septiembre|participant_id|response_id|native:|#native-v1:|nickname|>Comentario<|>Votante</i);
    assert.doesNotMatch(stdout, /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#NUM!|#NULL!|#SPILL!|#CALC!/);
  }
});

test('octubre permanece cerrado sin formularios ni llamadas a participar desde las portadas', async () => {
  for (const path of ['dist/index.html', 'dist/power-ranking/index.html', 'dist/power-ranking/votar/index.html']) {
    const html = await readFile(new URL(path, root), 'utf8');
    assert.match(html, /La votación no está abierta en este momento/);
    assert.doesNotMatch(html, /data-ballot-form|data-participation-cta|href="https:\/\/forms\.gle/);
  }
});
