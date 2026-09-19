// Lógica pura del feed de Captivate: parsing, validación y obtención con
// last-known-good. Sin estado global ni tipos: `src/lib/rss.ts` la envuelve y
// los tests la ejercitan con un `fetch` inyectado y snapshots temporales.
//
// Contrato de resiliencia:
//   remoto válido            → se usa el remoto
//   remoto falla + snapshot  → se usa el snapshot con aviso explícito
//   remoto falla + sin snap. → error claro; nunca un podcast vacío

import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

export const DEFAULT_FEED_URL = 'https://feeds.captivate.fm/visludica/';
// Ruta relativa a la raíz del proyecto: los scripts npm (build, refresh)
// ejecutan siempre con cwd en la raíz. No usar import.meta.url, que en el
// build de Astro apunta al bundle y no a las fuentes.
export const DEFAULT_SNAPSHOT_PATH = 'src/data/podcast/feed-snapshot.json';
export const FEED_TIMEOUT_MS = 10_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item',
  parseAttributeValue: false,
});

// Normaliza duración a "Xh Ym" o "Ym Zs"
function formatDuration(raw) {
  if (!raw) return '';
  const str = String(raw);
  // Ya está en formato HH:MM:SS o MM:SS
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      const [h, m] = parts;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    if (parts.length === 2) return `${parts[0]}m`;
    return str;
  }
  // Segundos como número
  const total = parseInt(str);
  if (isNaN(total)) return str;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extrae el ID UUID del GUID de Captivate
function extractCaptivateId(guid) {
  // Formato típico: UUID o URL terminando en UUID
  const uuidMatch = guid.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch ? uuidMatch[0] : guid;
}

// Parsea el XML del feed y devuelve la colección validada de episodios.
// Lanza si el XML no es parseable o no contiene una colección mínima válida.
export function parseFeedXml(xml) {
  const feed = parser.parse(xml);
  const channel = feed?.rss?.channel ?? {};
  const items = channel.item ?? [];

  const meta = {
    title: channel.title ?? 'Vis Ludica',
    description: channel.description ?? '',
    imageUrl:
      channel['itunes:image']?.['@_href'] ??
      channel.image?.url ??
      '',
  };

  const slugCount = {};

  const episodes = items.map((item) => {
    const rawGuid = String(item.guid?.['#text'] ?? item.guid ?? '');
    const captivateId = extractCaptivateId(rawGuid);

    const rawSlug = slugify(item.title ?? captivateId);
    slugCount[rawSlug] = (slugCount[rawSlug] ?? 0) + 1;
    const slug =
      slugCount[rawSlug] > 1 ? `${rawSlug}-${slugCount[rawSlug]}` : rawSlug;

    const description = String(
      item['itunes:summary'] ?? item.description ?? ''
    ).replace(/<[^>]+>/g, '').trim();

    return {
      title: String(item.title ?? ''),
      slug,
      captivateId,
      guid: rawGuid,
      pubDate: new Date(item.pubDate ?? ''),
      duration: formatDuration(item['itunes:duration']),
      description,
      content: String(item['content:encoded'] ?? item.description ?? ''),
      imageUrl:
        item['itunes:image']?.['@_href'] ??
        meta.imageUrl ??
        '',
      audioUrl: item.enclosure?.['@_url'] ?? '',
    };
  });

  const result = { episodes, meta };
  assertValidFeed(result, 'el feed');
  return result;
}

// Valida la estructura mínima para publicar el podcast. Devuelve el mismo
// objeto o lanza con un motivo descriptivo.
export function assertValidFeed(feed, origin = 'la fuente') {
  const problems = [];
  if (!feed || typeof feed !== 'object') {
    throw new Error(`${origin} no contiene un objeto de feed`);
  }
  if (!feed.meta || typeof feed.meta.title !== 'string' || !feed.meta.title.trim()) {
    problems.push('falta el título del canal');
  }
  if (!Array.isArray(feed.episodes) || feed.episodes.length === 0) {
    problems.push('no hay episodios');
  } else {
    feed.episodes.forEach((episode, index) => {
      if (!episode || typeof episode.title !== 'string' || !episode.title.trim()) {
        problems.push(`el episodio ${index + 1} no tiene título`);
      }
      if (!episode || typeof episode.slug !== 'string' || !episode.slug) {
        problems.push(`el episodio ${index + 1} no tiene slug`);
      }
      if (!episode || typeof episode.guid !== 'string' || !episode.guid) {
        problems.push(`el episodio ${index + 1} no tiene guid`);
      }
      if (
        !episode ||
        !(episode.pubDate instanceof Date) ||
        Number.isNaN(episode.pubDate.getTime())
      ) {
        problems.push(`el episodio ${index + 1} tiene una fecha no válida`);
      }
    });
  }
  if (problems.length) {
    throw new Error(`${origin} no es válido: ${problems.slice(0, 5).join('; ')}`);
  }
  return feed;
}

// Descarga y parsea el feed remoto. Lanza ante fallo de red, timeout,
// respuesta HTTP incorrecta, XML inválido o feed sin estructura mínima.
export async function fetchRemoteFeed({
  feedUrl = DEFAULT_FEED_URL,
  timeoutMs = FEED_TIMEOUT_MS,
  fetchImpl = fetch,
} = {}) {
  const fetchedAt = new Date();
  const response = await fetchImpl(feedUrl, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`respuesta HTTP ${response.status}`);
  }
  const feed = parseFeedXml(await response.text());
  return { feed, fetchedAt };
}

// Reconstruye un snapshot JSON (serializado con fechas ISO) y lo valida.
export function reviveSnapshot(raw, origin = 'el snapshot') {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${origin} no es JSON válido: ${error.message}`);
  }
  const feed = {
    episodes: (data?.episodes ?? []).map((episode) => ({
      ...episode,
      pubDate: new Date(episode?.pubDate),
    })),
    meta: data?.meta ?? {},
  };
  if (data?.captured_at) feed.capturedAt = new Date(data.captured_at);
  assertValidFeed(feed, origin);
  return feed;
}

async function loadSnapshot(snapshotPath) {
  const raw = await readFile(snapshotPath, 'utf8');
  return reviveSnapshot(raw);
}

// Punto de entrada: feed remoto con fallback al snapshot last-known-good.
// Devuelve `{ episodes, meta, source }` donde source es 'remote' o 'snapshot'.
// Nunca escribe archivos y nunca devuelve un podcast vacío: si no hay fuente
// válida, lanza.
export async function loadFeed({
  feedUrl = DEFAULT_FEED_URL,
  snapshotPath = DEFAULT_SNAPSHOT_PATH,
  timeoutMs = FEED_TIMEOUT_MS,
  fetchImpl = fetch,
  log = console,
} = {}) {
  try {
    const { feed, fetchedAt } = await fetchRemoteFeed({ feedUrl, timeoutMs, fetchImpl });
    return { ...feed, source: 'remote', fetchedAt };
  } catch (remoteError) {
    const remoteReason = remoteError?.message ?? String(remoteError);
    try {
      const feed = await loadSnapshot(snapshotPath);
      const capturedAt = feed.capturedAt instanceof Date && !Number.isNaN(feed.capturedAt.getTime())
        ? feed.capturedAt.toISOString()
        : 'fecha desconocida';
      log.warn(
        `[podcast] El feed remoto no está disponible (${remoteReason}). ` +
        `Construyendo con el snapshot last-known-good (${capturedAt}), que NO es el feed actual.`,
      );
      return { ...feed, source: 'snapshot' };
    } catch (snapshotError) {
      const snapshotReason = snapshotError?.message ?? String(snapshotError);
      throw new Error(
        `No se pudo construir el podcast: el feed remoto falló (${remoteReason}) ` +
        `y no hay un snapshot válido (${snapshotReason}).`,
      );
    }
  }
}
