import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ParticipationApiError,
  ParticipationClient,
} from '../src/lib/power-ranking/participation-client.mjs';
import {
  defineParticipationConfig,
  PART_075C_FORMS_URL,
  participationConfig,
} from '../src/data/power-ranking/participation.mjs';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('la configuración editorial admite native, forms y closed, pero Forms exige su URL aprobada', () => {
  assert.deepEqual(participationConfig, { mode: 'native', formsUrl: null, formsCutover: null });
  assert.equal(defineParticipationConfig({ mode: 'native' }).mode, 'native');
  assert.deepEqual(
    defineParticipationConfig({ mode: 'forms', formsUrl: PART_075C_FORMS_URL, formsCutover: '2026-09-15T12:00:00+02:00' }),
    { mode: 'forms', formsUrl: PART_075C_FORMS_URL, formsCutover: '2026-09-15T12:00:00+02:00' },
  );
  assert.equal(defineParticipationConfig({ mode: 'closed' }).mode, 'closed');
  assert.throws(() => defineParticipationConfig({ mode: 'forms' }), /URL HTTPS aprobada/);
  assert.throws(() => defineParticipationConfig({ mode: 'forms', formsUrl: 'https://forms.gle/otra-url' }), /URL HTTPS aprobada/);
  assert.throws(() => defineParticipationConfig({ mode: 'forms', formsUrl: `${PART_075C_FORMS_URL}?duplicated=true` }), /URL HTTPS aprobada/);
  assert.throws(() => defineParticipationConfig({ mode: 'native', formsUrl: 'https://forms.gle/not-active' }), /solo se declara/);
});

test('el cliente conserva WRITES_DISABLED al crear sesión y al guardar, sin convertirlo en fallback', async () => {
  const client = new ParticipationClient({
    fetchImpl: async () => response({ error: { code: 'WRITES_DISABLED', message: 'Public writes are temporarily disabled.' } }, 503),
  });
  await assert.rejects(client.createSession(), (error) => error instanceof ParticipationApiError && error.code === 'WRITES_DISABLED' && error.status === 503);
  await assert.rejects(
    client.saveBallot('campaign_001', { votes: [] }, { csrfToken: 'csrf', operationKey: 'operation' }),
    (error) => error instanceof ParticipationApiError && error.code === 'WRITES_DISABLED' && error.status === 503,
  );
});

test('la página conserva la papeleta ante pausas y no activa Forms ante ningún fallo de API', async () => {
  const source = await readFile(join(root, 'src/pages/power-ranking/votar.astro'), 'utf8');
  const script = source.slice(source.indexOf('<script>'));
  assert.match(script, /error\.code === 'WRITES_DISABLED'/);
  assert.match(script, /error\.code === 'NETWORK_UNCERTAIN'/);
  assert.match(script, /showPanel\('unavailable'\)/);
  assert.match(script, /state\.writesPaused = true/);
  assert.match(script, /!state\.writesPaused/);
  assert.match(script, /Conservamos los datos que has escrito/);
  assert.doesNotMatch(script, /formsUrl|location\.href|window\.location/);
  assert.match(source, /Privacidad de esta participación/);
  assert.match(source, /role="status" aria-live="polite"/);
});

test('la presentación separa formulario nativo, CTA Forms, cierre y contador web', async () => {
  const [page, card, builtVote] = await Promise.all([
    readFile(join(root, 'src/pages/power-ranking/votar.astro'), 'utf8'),
    readFile(join(root, 'src/components/PowerRankingParticipation.astro'), 'utf8'),
    readFile(join(root, 'dist/power-ranking/votar/index.html'), 'utf8'),
  ]);
  for (const source of [page, card]) {
    assert.match(source, /participationConfig\.mode === 'native'/);
    assert.match(source, /participationConfig\.mode === 'forms'/);
    assert.match(source, /participationConfig\.mode === 'closed'/);
  }
  assert.match(page, /Participar con Google Forms/);
  assert.match(page, /contador de papeletas de la web no se muestra/);
  assert.match(card, /papeletas recibidas en la web/);
  assert.match(builtVote, /data-ballot-form/);
  assert.match(builtVote, /Privacidad de esta participación/);
});

test('el runbook documenta Static Assets, ausencia de Route de producción y retención pendiente', async () => {
  const source = await readFile(join(root, 'docs/power-ranking.md'), 'utf8');
  assert.match(source, /Worker visludica-web → Static Assets/);
  assert.match(source, /npx wrangler deploy --config wrangler\.jsonc --name visludica-web/);
  assert.match(source, /staging\.visludica\.com/);
  assert.match(source, /todavía no existen/);
  assert.match(source, /PENDIENTE DE\n+RATIFICACIÓN de David/);
  assert.doesNotMatch(source, /Cloudflare Pages despliega solo/);
});
