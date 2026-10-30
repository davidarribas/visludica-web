import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { readQuotesV1, emptyQuotes } from '../src/lib/quotes-v1.mjs';

const root = new URL('../', import.meta.url);

const artefacto = (extra = {}) => ({
  schema_version: 'quotes-v1',
  period_id: '2026-10',
  generated_at: '2026-11-06T00:00:00Z',
  projects: { 'vis-ludica': [{ label: 'Ark Nova', text: 'Un euro seco y maravilloso.', attribution: '@Krev' }] },
  ...extra,
});

test('una edición sin quotes.json no muestra la sección y no es un error', () => {
  assert.deepEqual(readQuotesV1('2026-10', undefined), { quotes: emptyQuotes() });
  assert.deepEqual(readQuotesV1('2026-10', null), { quotes: emptyQuotes() });
});

test('las citas válidas llegan tal cual, con la atribución opcional', () => {
  const { quotes, problem } = readQuotesV1('2026-10', artefacto());
  assert.equal(problem, undefined);
  assert.deepEqual(quotes['vis-ludica'], [
    { label: 'Ark Nova', text: 'Un euro seco y maravilloso.', attribution: '@Krev' },
  ]);
  assert.deepEqual(quotes['vis-belica'], []);

  const sinFirma = readQuotesV1('2026-10', artefacto({
    projects: { 'vis-ludica': [{ label: 'Hegemony', text: 'Sin alias pero con opinión.' }] },
  }));
  assert.equal(sinFirma.problem, undefined);
  assert.equal('attribution' in sinFirma.quotes['vis-ludica'][0], false);
});

test('un artefacto de otro periodo o de otro esquema no se publica', () => {
  assert.match(readQuotesV1('2026-10', artefacto({ period_id: '2026-09' })).problem, /2026-09/);
  assert.match(readQuotesV1('2026-10', artefacto({ schema_version: 'quotes-v2' })).problem, /quotes-v1/);
});

test('una cita a medias rompe en vez de publicar media frase', () => {
  const casos = [
    [{ text: 'sin etiqueta' }, /label/],
    [{ label: 'Ark Nova' }, /text/],
    [{ label: 'Ark Nova', text: '   ' }, /text/],
    [{ label: 'Ark Nova', text: 'válida', attribution: '  ' }, /atribución vacía/],
  ];
  for (const [cita, esperado] of casos) {
    const { problem } = readQuotesV1('2026-10', artefacto({ projects: { 'vis-ludica': [cita] } }));
    assert.match(problem, esperado);
  }
});

test('no se cuela nada que no se publique', () => {
  const { problem } = readQuotesV1('2026-10', artefacto({
    projects: { 'vis-ludica': [{ label: 'Ark Nova', text: 'válida', response_id: 'r1' }] },
  }));
  assert.match(problem, /response_id/);
});

test('un proyecto desconocido o una lista vacía se rechazan', () => {
  assert.match(readQuotesV1('2026-10', artefacto({ projects: { 'vis-otro': [] } })).problem, /vis-otro/);
  assert.match(readQuotesV1('2026-10', artefacto({ projects: { 'vis-ludica': [] } })).problem, /ninguna cita/);
  assert.match(readQuotesV1('2026-10', artefacto({ projects: {} })).problem, /ningún proyecto/);
});

test('junio conserva las citas que se publicaron escritas a mano', async () => {
  const fuente = await readFile(new URL('src/data/power-ranking/2026-06/editorial.ts', root), 'utf8');
  assert.match(fuente, /La frase del mes/);
  const html = await readFile(new URL('dist/power-ranking/2026/06/index.html', root), 'utf8');
  assert.match(html, /Lo mejor de las papeletas/);
  assert.match(html, /La frase del mes/);
});

test('septiembre no inventa una sección vacía', async () => {
  const html = await readFile(new URL('dist/power-ranking/2026/09/index.html', root), 'utf8');
  assert.equal(html.includes('Lo mejor de las papeletas'), false);
});
