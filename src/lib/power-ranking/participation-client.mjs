const API_PATH = "/api/power-ranking/v1";

export const REFERRAL_SOURCES = new Set([
  "direct", "telegram", "x", "bluesky", "newsletter", "substack", "youtube", "other",
]);

export class ParticipationApiError extends Error {
  constructor(code, { status = 0, message = "", retryAfter = null, cause } = {}) {
    super(message || code);
    this.name = "ParticipationApiError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
    this.cause = cause;
  }
}

function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function apiErrorFromResponse(response, body) {
  const code = body?.error?.code;
  const retryAfter = response.headers.get("Retry-After");
  return new ParticipationApiError(typeof code === "string" ? code : "SERVICE_UNAVAILABLE", {
    status: response.status,
    message: typeof body?.error?.message === "string" ? body.error.message : "",
    retryAfter: retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null,
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new ParticipationApiError("SERVICE_UNAVAILABLE", { status: response.status });
  }
}

export function normalizeReferralSource(value) {
  if (!value) return "direct";
  const candidate = String(value).trim().toLocaleLowerCase("es");
  return REFERRAL_SOURCES.has(candidate) ? candidate : "other";
}

/**
 * Conserva únicamente un valor `src` ya reconocido por el contrato. A
 * diferencia de normalizeReferralSource, aquí un valor desconocido se omite:
 * la navegación interna no debe convertir parámetros arbitrarios en `other`.
 */
export function permittedReferralSource(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLocaleLowerCase("es");
  return REFERRAL_SOURCES.has(candidate) ? candidate : null;
}

/**
 * URL estable para los CTA internos. Solo admite el único parámetro público
 * que puede conservarse entre páginas; nunca reenvía el resto de la URL.
 */
export function participationUrl(search = "") {
  const source = permittedReferralSource(new URLSearchParams(search).get("src"));
  return source ? `/power-ranking/votar/?src=${encodeURIComponent(source)}` : "/power-ranking/votar/";
}

export function createOperationKey(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (randomUUID) return randomUUID();
  // UUID v4 compatible con el patrón ASCII que acepta la API; se usa solo en navegadores antiguos.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letter) => {
    const random = Math.floor(Math.random() * 16);
    return (letter === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function validateSelections(selections) {
  const votes = [];
  const games = new Set();
  for (const position of [1, 2, 3]) {
    const selection = selections[position];
    if (!selection) continue;
    if (selection.kind === "game") {
      if (!selection.game_id) return { ok: false, message: `La posición ${position} no tiene un juego válido.` };
      if (games.has(selection.game_id)) return { ok: false, message: "No puedes elegir el mismo juego en dos posiciones." };
      games.add(selection.game_id);
      votes.push({ position, selection: { kind: "game", game_id: selection.game_id } });
    } else if (selection.kind === "proposal") {
      const rawName = optionalText(selection.raw_name);
      if (!rawName) return { ok: false, message: `Escribe el nombre del juego propuesto para la posición ${position}.` };
      votes.push({ position, selection: { kind: "proposal", raw_name: rawName, reference: null } });
    } else {
      return { ok: false, message: `La posición ${position} no es válida.` };
    }
  }
  if (!votes.length) return { ok: false, message: "Elige al menos un juego antes de enviar la papeleta." };
  return { ok: true, votes };
}

export function buildWritePayload({ campaign, version = 0, selections, nickname, comment, referralSource, includeReferral = false }) {
  const validated = validateSelections(selections);
  if (!validated.ok) throw new ParticipationApiError("INVALID_BALLOT", { message: validated.message });
  const payload = {
    schema_version: "participation-v1",
    campaign_id: campaign.campaign_id,
    catalog_version: campaign.catalog_version,
    expected_version: version,
    votes: validated.votes,
  };
  const cleanNickname = optionalText(nickname);
  if (cleanNickname) payload.nickname = cleanNickname;
  // El Worker permite comentario vacío; omitirlo mantiene el body mínimo y evita inventar datos.
  if (typeof comment === "string" && comment.length > 0) payload.comment = comment;
  if (includeReferral) payload.referral_source = normalizeReferralSource(referralSource);
  return payload;
}

export function ballotMatchesPayload(ballot, payload) {
  if (!ballot || !Array.isArray(ballot.votes)) return false;
  const asComparable = (votes) => votes
    .map((vote) => ({ position: vote.position, selection: vote.selection.kind === "game"
      ? { kind: "game", game_id: vote.selection.game_id }
      : { kind: "proposal", raw_name: vote.selection.raw_name, reference: null } }))
    .sort((left, right) => left.position - right.position);
  return JSON.stringify(asComparable(ballot.votes)) === JSON.stringify(asComparable(payload.votes))
    && (ballot.nickname ?? undefined) === (payload.nickname ?? undefined)
    && (ballot.comment ?? undefined) === (payload.comment ?? undefined);
}

export class ParticipationClient {
  constructor({ fetchImpl = globalThis.fetch?.bind(globalThis), basePath = API_PATH } = {}) {
    if (!fetchImpl) throw new Error("ParticipationClient requires fetch");
    this.fetch = fetchImpl;
    this.basePath = basePath.replace(/\/$/, "");
  }

  async request(path, init = {}) {
    let response;
    try {
      response = await this.fetch(`${this.basePath}${path}`, { credentials: "same-origin", ...init });
    } catch (cause) {
      throw new ParticipationApiError("NETWORK_UNCERTAIN", { cause });
    }
    const body = await readJson(response);
    if (!response.ok) throw apiErrorFromResponse(response, body);
    return body;
  }

  getCampaign() { return this.request("/campaign"); }
  getSummary(campaignId) { return this.request(`/campaigns/${encodeURIComponent(campaignId)}/summary`); }
  getBallot(campaignId) { return this.request(`/campaigns/${encodeURIComponent(campaignId)}/ballot`); }
  searchGames(query) { return this.request(`/games?q=${encodeURIComponent(query)}`); }
  createSession() { return this.request("/session", { method: "POST" }); }

  saveBallot(campaignId, payload, { csrfToken, operationKey }) {
    return this.request(`/campaigns/${encodeURIComponent(campaignId)}/ballot`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        "Idempotency-Key": operationKey,
      },
      body: JSON.stringify(payload),
    });
  }
}
