import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertDeploymentSafe,
  inspectVoteArtifact,
  readProductionCampaign,
} from '../scripts/deploy-production-safe.mjs';

const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('bloquea un artefacto cerrado cuando la campaña de producción está abierta', () => {
  assert.throws(
    () => assertDeploymentSafe({
      artifactMode: 'closed',
      campaignState: { kind: 'open', campaign: { campaign_id: '2026-10' } },
    }),
    /DEPLOY_BLOCKED_OPEN_CAMPAIGN_CLOSED_ARTIFACT/,
  );
});

test('permite el artefacto nativo con campaña abierta', () => {
  assert.doesNotThrow(() => assertDeploymentSafe({
    artifactMode: 'native',
    campaignState: { kind: 'open', campaign: { campaign_id: '2026-10' } },
  }));
});

test('solo reconoce como ausencia la respuesta explícita NO_ACTIVE_CAMPAIGN', async () => {
  const state = await readProductionCampaign({
    fetchImpl: async () => response({ error: { code: 'NO_ACTIVE_CAMPAIGN' } }, 404),
  });
  assert.deepEqual(state, { kind: 'confirmed_no_active_campaign' });
});

test('una incidencia de red bloquea y no se convierte en ausencia de campaña', async () => {
  await assert.rejects(
    readProductionCampaign({ fetchImpl: async () => { throw new Error('network down'); } }),
    /PRODUCTION_STATE_UNAVAILABLE.*no se interpreta como ausencia/,
  );
});

test('una respuesta HTTP inesperada bloquea la comprobación', async () => {
  await assert.rejects(
    readProductionCampaign({ fetchImpl: async () => response({ error: { code: 'SERVICE_UNAVAILABLE' } }, 503) }),
    /PRODUCTION_STATE_UNAVAILABLE.*HTTP 503/,
  );
});

test('el artefacto distingue formulario nativo y cierre, y rechaza ambigüedad', () => {
  assert.equal(inspectVoteArtifact('<form data-ballot-form></form>'), 'native');
  assert.equal(inspectVoteArtifact('<p>La votación no está abierta en este momento.</p>'), 'closed');
  assert.throws(() => inspectVoteArtifact('<main>sin marcadores</main>'), /WEB_ARTIFACT_UNCLEAR/);
  assert.throws(
    () => inspectVoteArtifact('<form data-ballot-form></form><p>La votación no está abierta en este momento.</p>'),
    /WEB_ARTIFACT_UNCLEAR/,
  );
});
