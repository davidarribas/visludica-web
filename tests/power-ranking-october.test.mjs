import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadPublicResultsV1, validatePublicResultsV1 } from '../src/lib/public-results-v1.mjs';
import { editorial } from '../src/data/power-ranking/2026-10/editorial.ts';

const root = new URL('../', import.meta.url);
const bytes = await readFile(new URL('src/data/power-ranking/2026-10/public-results.json', root));
const contract = JSON.parse(bytes);
const edition = loadPublicResultsV1(contract);
const quotes = JSON.parse(await readFile(new URL('src/data/power-ranking/2026-10/quotes.json', root), 'utf8'));
const html = await readFile(new URL('dist/power-ranking/2026/10/index.html', root), 'utf8');

// Trocea la página por proyecto y por pestaña para comprobar que cada bloque
// aparece donde toca y no en cualquier parte del documento.
function project(projectId) {
  const chunk = html.split(/<section[^>]+data-project-panel="/).slice(1).find(item => item.startsWith(`${projectId}"`));
  assert.ok(chunk, `falta el panel ${projectId}`);
  return chunk;
}

function view(projectId, viewId) {
  const panel = project(projectId).split(/data-view-panel="/).slice(1).find(chunk => chunk.startsWith(`${viewId}"`));
  assert.ok(panel, `falta la pestaña ${projectId}/${viewId}`);
  return panel;
}

test('octubre importa el paquete aprobado en GATE 4 sin modificar un byte', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '96d64722ca7b38fe00f0c654e24e0b3e209d363ebb2a186ae1509815a57dee01');
  validatePublicResultsV1(contract);
  assert.equal(edition.projects['vis-belica'].stats.voters, 47);
  assert.deepEqual(
    contract.projects['vis-belica'].voter_history.map(item => item.valid_voters),
    [18, 18, 34, 41, 53, 46, 68, 61, 47],
  );
});

test('las notas del podio de octubre casan con los vlg_* del contrato en Power y en el mes', () => {
  const podiums = {
    'vis-ludica': { power: ['vlg_000070', 'vlg_000830', 'vlg_000682'], monthly: ['vlg_000682', 'vlg_000314', 'vlg_000070'] },
    'vis-belica': { power: ['vlg_000240', 'vlg_000959', 'vlg_000331'], monthly: ['vlg_000240', 'vlg_000959', 'vlg_000228'] },
  };
  for (const [projectId, views] of Object.entries(podiums)) {
    for (const [viewId, ids] of Object.entries(views)) {
      const ranking = contract.projects[projectId][viewId === 'power' ? 'power_ranking' : 'monthly_ranking'];
      assert.deepEqual(ranking.slice(0, 3).map(row => row.game_id), ids);
      assert.deepEqual(Object.keys(editorial[projectId][viewId].notes), ids);
      // Una nota sin juego que case desaparece en silencio: se busca su
      // arranque literal en la pestaña donde tiene que salir.
      for (const id of ids) {
        const start = editorial[projectId][viewId].notes[id].slice(0, 24);
        assert.ok(view(projectId, viewId).includes(start), `${projectId}/${viewId}: falta la nota de ${id}`);
      }
    }
    assert.ok(view(projectId, 'power').includes('Zona noble'), `${projectId}: falta la Zona noble`);
  }
});

test('las citas de octubre salen en la pestaña del mes, en el orden elegido', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(quotes.projects).map(([projectId, items]) => [projectId, items.length])),
    { 'vis-ludica': 7, 'vis-belica': 1 },
  );
  for (const [projectId, items] of Object.entries(quotes.projects)) {
    const monthly = view(projectId, 'monthly').split('community-voices')[1] ?? '';
    assert.match(monthly, /Los mejores comentarios/);
    assert.doesNotMatch(view(projectId, 'power'), /Los mejores comentarios/);
    const offsets = items.map(item => monthly.indexOf(item.label));
    offsets.forEach((offset, index) => assert.ok(offset >= 0, `${projectId}: falta la cita «${items[index].label}»`));
    assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
    for (const item of items) assert.equal(Object.hasOwn(item, 'response_id'), false);
  }
  assert.equal(quotes.projects['vis-ludica'][0].label, 'La frase del mes');
});

test('la tarjeta de votantes de Vis Bélica cuenta octubre y la crónica trae su TOP 10', () => {
  assert.match(project('vis-belica'), /47 votantes en octubre/);
  for (const projectId of ['vis-ludica', 'vis-belica']) {
    const marked = editorial[projectId].chronicle.sections.filter(section => section.monthlyTop10);
    assert.equal(marked.length, 1);
    const analysis = view(projectId, 'analysis');
    const afterTitle = analysis.slice(analysis.indexOf(`>${marked[0].title}<`));
    assert.match(afterTitle.split('<h3')[0], /chronicle-top10/);
  }
});
