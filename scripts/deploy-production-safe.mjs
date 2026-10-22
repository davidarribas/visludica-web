#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_ORIGIN = 'https://visludica.com';
export const PRODUCTION_CAMPAIGN_URL = `${PRODUCTION_ORIGIN}/api/power-ranking/v1/campaign`;
export const VOTE_ARTIFACT_PATH = 'dist/power-ranking/votar/index.html';

const confirmedCampaignStates = new Set([
  'open',
  'confirmed_not_open',
  'confirmed_no_active_campaign',
]);

export function inspectVoteArtifact(html) {
  const hasNativeForm = html.includes('data-ballot-form');
  const hasClosedMessage = html.includes('La votación no está abierta en este momento');

  if (hasNativeForm === hasClosedMessage) {
    throw new Error('WEB_ARTIFACT_UNCLEAR: no se puede determinar un único modo de participación en dist/power-ranking/votar/index.html.');
  }
  return hasNativeForm ? 'native' : 'closed';
}

function unavailable(message, cause) {
  return new Error(`PRODUCTION_STATE_UNAVAILABLE: ${message}`, { cause });
}

export async function readProductionCampaign({
  fetchImpl = globalThis.fetch,
  endpoint = PRODUCTION_CAMPAIGN_URL,
} = {}) {
  if (typeof fetchImpl !== 'function') throw unavailable('fetch no está disponible.');

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    throw unavailable('la consulta GET de producción falló; no se interpreta como ausencia de campaña.', error);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw unavailable(`la respuesta HTTP ${response.status} no contiene JSON válido.`, error);
  }

  if (response.status === 200 && response.ok) {
    if (body?.schema_version !== 'participation-v1'
      || typeof body.campaign_id !== 'string'
      || typeof body.status !== 'string') {
      throw unavailable('la respuesta de campaña no cumple el contrato esperado.');
    }
    return body.status === 'open'
      ? { kind: 'open', campaign: body }
      : { kind: 'confirmed_not_open', campaign: body };
  }

  if (response.status === 404 && body?.error?.code === 'NO_ACTIVE_CAMPAIGN') {
    return { kind: 'confirmed_no_active_campaign' };
  }

  throw unavailable(`la API devolvió HTTP ${response.status} sin un estado de campaña verificable.`);
}

export function assertDeploymentSafe({ artifactMode, campaignState }) {
  if (artifactMode !== 'native' && artifactMode !== 'closed') {
    throw new Error(`WEB_ARTIFACT_UNCLEAR: modo de participación no admitido: ${artifactMode}`);
  }
  if (!campaignState || !confirmedCampaignStates.has(campaignState.kind)) {
    throw new Error('PRODUCTION_STATE_UNAVAILABLE: el estado de producción no está confirmado; se detiene el despliegue.');
  }
  if (campaignState.kind === 'open' && artifactMode === 'closed') {
    throw new Error('DEPLOY_BLOCKED_OPEN_CAMPAIGN_CLOSED_ARTIFACT: la campaña está abierta y el artefacto web está cerrado.');
  }
}

export async function runPreflight({
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const artifactPath = resolve(cwd, VOTE_ARTIFACT_PATH);
  let html;
  try {
    html = readFileSync(artifactPath, 'utf8');
  } catch (error) {
    throw new Error(`WEB_ARTIFACT_UNAVAILABLE: no se puede leer ${VOTE_ARTIFACT_PATH}.`, { cause: error });
  }

  const artifactMode = inspectVoteArtifact(html);
  const campaignState = await readProductionCampaign({ fetchImpl });
  assertDeploymentSafe({ artifactMode, campaignState });
  return { artifactMode, campaignState, artifactPath };
}

function gitSha(cwd) {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('No se pudo resolver el commit Git del artefacto web.');
  return result.stdout.trim();
}

export async function deployProduction({
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  spawn = spawnSync,
} = {}) {
  const preflight = await runPreflight({ cwd, fetchImpl });
  const revision = gitSha(cwd);
  console.log(`Preflight OK: artifact=${preflight.artifactMode}; campaign=${preflight.campaignState.kind}; revision=${revision}`);

  const result = spawn('npx', [
    'wrangler', 'deploy',
    '--config', 'wrangler.jsonc',
    '--name', 'visludica-web',
    '--message', `Web: ${revision}; participation preflight passed`,
  ], { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Wrangler terminó por señal ${result.signal}.`);
  if (result.status !== 0) throw new Error(`Wrangler terminó con código ${result.status ?? 1}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deployProduction().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
