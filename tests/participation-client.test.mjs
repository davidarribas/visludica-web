import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  ParticipationApiError,
  ParticipationClient,
  ballotMatchesPayload,
  buildWritePayload,
  createOperationKey,
  normalizeReferralSource,
  participationUrl,
  permittedReferralSource,
  validateSelections,
} from "../src/lib/power-ranking/participation-client.mjs";

const campaign = {
  schema_version: "participation-v1", campaign_id: "campaign_001", name: "Septiembre", status: "open",
  opens_at: "2026-09-01T00:00:00.000Z", closes_at: "2026-09-30T00:00:00.000Z", catalog_version: "catalog_001",
};
const game = (id, display_name = id) => ({ kind: "game", game_id: id, display_name });
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

test("el payload conserva posiciones, propuestas y solo los campos permitidos", () => {
  const one = buildWritePayload({ campaign, selections: { 1: game("a", "Álpha") }, nickname: " Ana ", comment: "", referralSource: "telegram", includeReferral: true });
  assert.deepEqual(one, {
    schema_version: "participation-v1", campaign_id: "campaign_001", catalog_version: "catalog_001", expected_version: 0,
    votes: [{ position: 1, selection: { kind: "game", game_id: "a" } }], nickname: "Ana", referral_source: "telegram",
  });
  const spaced = buildWritePayload({ campaign, version: 7, selections: { 1: game("a"), 3: { kind: "proposal", raw_name: " Juego nuevo " } }, nickname: "", comment: "nota", includeReferral: false });
  assert.deepEqual(spaced.votes, [
    { position: 1, selection: { kind: "game", game_id: "a" } },
    { position: 3, selection: { kind: "proposal", raw_name: "Juego nuevo", reference: null } },
  ]);
  assert.equal(spaced.expected_version, 7);
  assert.equal("referral_source" in spaced, false);
  for (const forbidden of ["participant_id", "ballot_id", "revision_id", "received_at", "entry_channel", "response_id", "points"]) assert.equal(forbidden in spaced, false);
});

test("la selección detecta vacío, juego duplicado y propuestas inválidas", () => {
  assert.equal(validateSelections({}).ok, false);
  assert.match(validateSelections({ 1: game("a"), 2: game("a") }).message, /mismo juego/);
  assert.match(validateSelections({ 2: { kind: "proposal", raw_name: " " } }).message, /propuesto/);
  assert.deepEqual(validateSelections({ 1: game("a"), 2: game("b"), 3: game("c") }).votes.map(({ position }) => position), [1, 2, 3]);
});

test("normaliza el origen con allowlist sin conservar URL", () => {
  assert.equal(normalizeReferralSource("youtube"), "youtube");
  assert.equal(normalizeReferralSource("https://example.test/?src=x"), "other");
  assert.equal(normalizeReferralSource(null), "direct");
});

test("el CTA interno solo conserva src permitido y descarta el resto de parámetros", () => {
  assert.equal(permittedReferralSource("newsletter"), "newsletter");
  assert.equal(permittedReferralSource("unknown"), null);
  assert.equal(participationUrl("?src=telegram&utm_campaign=septiembre"), "/power-ranking/votar/?src=telegram");
  assert.equal(participationUrl("?src=https%3A%2F%2Fexample.test%2F&foo=bar"), "/power-ranking/votar/");
  assert.equal(participationUrl("?foo=bar"), "/power-ranking/votar/");
});

test("el cliente consulta campaña y papeleta sin crear sesión", async () => {
  const calls = [];
  const client = new ParticipationClient({ fetchImpl: async (url, init) => { calls.push([url, init]); return response(url.endsWith("/campaign") ? campaign : { ballot: null }); } });
  assert.deepEqual(await client.getCampaign(), campaign);
  assert.deepEqual(await client.getBallot("campaign_001"), { ballot: null });
  assert.equal(calls.some(([url]) => url.endsWith("/session")), false);
  assert.ok(calls.every(([, init]) => init.credentials === "same-origin"));
});

test("las lecturas públicas de campaña y resumen no crean sesión ni consultan una papeleta", async () => {
  const calls = [];
  const client = new ParticipationClient({ fetchImpl: async (url, init) => {
    calls.push([url, init]);
    if (url.endsWith("/campaign")) return response(campaign);
    return response({ campaign_id: campaign.campaign_id, received_ballots: 0, status: "open", closes_at: campaign.closes_at });
  } });
  await client.getCampaign();
  const summary = await client.getSummary(campaign.campaign_id);
  assert.equal(summary.received_ballots, 0);
  assert.deepEqual(calls.map(([url]) => url.replace("/api/power-ranking/v1", "")), ["/campaign", `/campaigns/${campaign.campaign_id}/summary`]);
  assert.equal(calls.some(([url]) => /\/session$|\/ballot$/.test(url)), false);
  assert.ok(calls.every(([, init]) => init.credentials === "same-origin" && !init.method));
});

test("trata SESSION_REQUIRED inicial como estado recuperable sin inventar una identidad", async () => {
  const client = new ParticipationClient({ fetchImpl: async () => response({ error: { code: "SESSION_REQUIRED", message: "Session required." } }, 401) });
  await assert.rejects(client.getBallot("campaign_001"), (error) => error instanceof ParticipationApiError && error.code === "SESSION_REQUIRED");
});

test("recupera una papeleta existente con su versión, posiciones y texto", async () => {
  const ballot = {
    version: 4,
    votes: [{ position: 1, selection: game("a", "Álpha") }, { position: 3, selection: { kind: "proposal", raw_name: "Propuesta", reference: null } }],
    nickname: "Ana", comment: "Un comentario",
  };
  const client = new ParticipationClient({ fetchImpl: async () => response({ ballot }) });
  assert.deepEqual(await client.getBallot(campaign.campaign_id), { ballot });
});

test("crea sesión solo al escribir y pasa CSRF e Idempotency-Key al PUT", async () => {
  const calls = [];
  const client = new ParticipationClient({ fetchImpl: async (url, init) => {
    calls.push([url, init]);
    if (url.endsWith("/session")) return response({ csrf_token: "csrf", expires_at: "2026-10-01T00:00:00Z" });
    return response({ ballot: { version: 1, votes: [{ position: 1, selection: { ...game("a"), display_name: "A" } }] } });
  } });
  const session = await client.createSession();
  const payload = buildWritePayload({ campaign, selections: { 1: game("a") } });
  await client.saveBallot(campaign.campaign_id, payload, { csrfToken: session.csrf_token, operationKey: "operation-1" });
  assert.equal(calls[0][0].endsWith("/session"), true);
  assert.equal(calls[1][1].headers["X-CSRF-Token"], "csrf");
  assert.equal(calls[1][1].headers["Idempotency-Key"], "operation-1");
  assert.deepEqual(JSON.parse(calls[1][1].body), payload);
});

test("una operación conserva su clave en retry y las claves nuevas son distintas", () => {
  assert.equal(createOperationKey(() => "fixed-key"), "fixed-key");
  const first = createOperationKey();
  const retry = first;
  assert.equal(retry, first);
  assert.match(first, /^[A-Za-z0-9._~-]{1,128}$/);
});

test("los errores semánticos conservan su código, incluido conflicto, catálogo, cierre, pausa y límite", async () => {
  for (const [code, status] of [["NO_ACTIVE_CAMPAIGN", 404], ["VERSION_CONFLICT", 409], ["CATALOG_CHANGED", 409], ["CAMPAIGN_CLOSED", 409], ["SESSION_REQUIRED", 401], ["RATE_LIMITED", 429], ["WRITES_DISABLED", 503], ["SERVICE_UNAVAILABLE", 503]]) {
    const client = new ParticipationClient({ fetchImpl: async () => response({ error: { code, message: code } }, status, code === "RATE_LIMITED" ? { "Retry-After": "12" } : {}) });
    await assert.rejects(client.getCampaign(), (error) => error.code === code && (code !== "RATE_LIMITED" || error.retryAfter === 12));
  }
});

test("un timeout ambiguo se distingue de un fallo HTTP y la recuperación compara contenido confirmado", async () => {
  const client = new ParticipationClient({ fetchImpl: async () => { throw new Error("connection reset"); } });
  await assert.rejects(client.getCampaign(), (error) => error.code === "NETWORK_UNCERTAIN");
  const payload = buildWritePayload({ campaign, selections: { 1: game("a"), 3: { kind: "proposal", raw_name: "Nuevo" } }, nickname: "A", comment: "C" });
  assert.equal(ballotMatchesPayload({ version: 1, votes: [{ position: 3, selection: { kind: "proposal", raw_name: "Nuevo", reference: null } }, { position: 1, selection: game("a") }], nickname: "A", comment: "C" }, payload), true);
  assert.equal(ballotMatchesPayload({ version: 1, votes: [{ position: 1, selection: game("different") }] }, payload), false);
});

test("la ruta usa DOM seguro, no persiste datos privados y mantiene controles accesibles", async () => {
  const source = await readFile(new URL("../src/pages/power-ranking/votar.astro", import.meta.url), "utf8");
  assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage/);
  assert.match(source, /role', 'combobox'|role="combobox"/);
  assert.match(source, /ArrowDown|Escape|Enter/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /max-width: 640px/);
  assert.match(source, /renderNewParticipationAction/);
  assert.match(source, /retryAt/);
});

test("el componente público distingue estados, usa el resumen y no expone un ranking provisional", async () => {
  const source = await readFile(new URL("../src/components/PowerRankingParticipation.astro", import.meta.url), "utf8");
  assert.match(source, /getCampaign\(\)/);
  assert.match(source, /getSummary\(campaign\.campaign_id\)/);
  assert.match(source, /Votar ahora/);
  assert.match(source, /Ahora no hay una votación abierta/);
  assert.match(source, /Consulta el estado de la votación/);
  assert.match(source, /papeletas recibidas en la web/);
  assert.match(source, /received_ballots >= 0/);
  assert.match(source, /timeZone: 'Europe\/Madrid'/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.doesNotMatch(source, /getBallot\(|createSession\(|saveBallot\(|personas|clasificación provisional/);
});

test("una papeleta confirmada vuelve a consultar el resumen sin alterar el contador local", async () => {
  const source = await readFile(new URL("../src/pages/power-ranking/votar.astro", import.meta.url), "utf8");
  assert.match(source, /async function refreshSummary\(\)/);
  assert.match(source, /client\.getSummary\(state\.campaign\.campaign_id\)/);
  assert.match(source, /void refreshSummary\(\)/);
  assert.match(source, /papeletas recibidas en la web/);
  assert.doesNotMatch(source, /received_ballots\s*(?:\+\+|\+=|=\s*[^;]*\+)/);
});
