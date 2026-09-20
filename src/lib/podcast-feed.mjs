// Lógica pura del feed de Captivate: parsing, validación, identidad
// persistente (GUID → slug) y obtención con last-known-good. Sin estado
// global ni tipos: `src/lib/rss.ts` la envuelve y los tests la ejercitan con
// un `fetch` inyectado y ficheros temporales.
//
// Contrato de resiliencia:
//   remoto válido            → se usa el remoto (solo episodios registrados)
//   remoto falla + snapshot  → se usa el snapshot con aviso explícito
//   remoto falla + sin snap. → error claro; nunca un podcast vacío
//
// Contrato de identidad:
//   la URL de un episodio vive en el registro GUID→slug y solo cambia en
//   `podcast:refresh`; el título y el orden del feed no afectan a URLs
//   conocidas; los GUID nuevos no se publican hasta su registro.

import { readFile, rename, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

export const DEFAULT_FEED_URL = 'https://feeds.captivate.fm/visludica/';
// Ruta relativa a la raíz del proyecto: los scripts npm (build, refresh)
// ejecutan siempre con cwd en la raíz. No usar import.meta.url, que en el
// build de Astro apunta al bundle y no a las fuentes.
export const DEFAULT_SNAPSHOT_PATH = 'src/data/podcast/feed-snapshot.json';
export const DEFAULT_REGISTRY_PATH = 'src/data/podcast/slug-registry.json';
export const REGISTRY_VERSION = 1;
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
// objeto o lanza con un motivo descriptivo. Los GUID deben ser utilizables y
// únicos dentro de la colección.
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
    const seenGuids = new Map();
    feed.episodes.forEach((episode, index) => {
      if (!episode || typeof episode.title !== 'string' || !episode.title.trim()) {
        problems.push(`el episodio ${index + 1} no tiene título`);
      }
      if (!episode || typeof episode.slug !== 'string' || !episode.slug) {
        problems.push(`el episodio ${index + 1} no tiene slug`);
      }
      if (!episode || typeof episode.guid !== 'string' || !episode.guid) {
        problems.push(`el episodio ${index + 1} no tiene guid`);
      } else if (seenGuids.has(episode.guid)) {
        problems.push(
          `GUID duplicado ${episode.guid} en los episodios ${seenGuids.get(episode.guid) + 1} y ${index + 1}`,
        );
      } else {
        seenGuids.set(episode.guid, index);
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

// ——— Identidad persistente (GUID → slug) ———

// Carga y valida el registro versionado de slugs. Estructura:
//   { "version": 1, "slugs": { "<guid>": "<slug-público>" } }
// Todos los valores son slugs reservados para siempre, aunque su episodio
// desaparezca del feed. Falla claramente si el registro es inválido: sin
// identidad garantizada no se publica.
export async function loadRegistry(registryPath) {
  let data;
  try {
    data = JSON.parse(await readFile(registryPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `No se pudo leer el registro de slugs (${registryPath}): ${error.message}. ` +
      'Sin registro no se puede garantizar la identidad de las URLs.',
    );
  }
  return validateRegistry(data, registryPath);
}

export function validateRegistry(data, origin = 'el registro de slugs') {
  if (!data || typeof data !== 'object' || data.version !== REGISTRY_VERSION) {
    throw new Error(`${origin} no es válido: versión desconocida (se espera ${REGISTRY_VERSION})`);
  }
  const slugs = data.slugs;
  if (!slugs || typeof slugs !== 'object' || Array.isArray(slugs)) {
    throw new Error(`${origin} no es válido: falta el mapa de slugs`);
  }
  const bySlug = new Map();
  for (const [guid, slug] of Object.entries(slugs)) {
    if (!guid || typeof slug !== 'string' || !slug) {
      throw new Error(`${origin} no es válido: entrada GUID→slug incompleta`);
    }
    if (bySlug.has(slug)) {
      throw new Error(
        `${origin} no es válido: los GUID ${bySlug.get(slug)} y ${guid} comparten el slug «${slug}»`,
      );
    }
    bySlug.set(slug, guid);
  }
  return { version: REGISTRY_VERSION, slugs };
}

// Resuelve los slugs públicos desde el registro. Los GUID registrados usan
// SIEMPRE su slug persistido (el título o el orden del feed no cuentan). Los
// GUID no registrados se separan sin URL provisional: no se publican hasta
// que `podcast:refresh` los incorpore.
export function resolveEpisodes(episodes, registry) {
  const known = [];
  const unknown = [];
  for (const episode of episodes) {
    const slug = registry.slugs[episode.guid];
    if (slug) known.push({ ...episode, slug });
    else unknown.push({ guid: episode.guid, title: episode.title });
  }
  return { episodes: known, unknown };
}

// Propone el siguiente slug disponible para un GUID nuevo: título
// slugificado y, si está reservado, sufijo -2, -3… Considera todos los slugs
// reservados (históricos incluidos), no solo los del feed actual.
export function assignNewSlug(title, reservedSlugs) {
  const base = slugify(String(title ?? '')) || 'episodio';
  if (!reservedSlugs.has(base)) return base;
  let counter = 2;
  while (reservedSlugs.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

async function writeAtomic(path, data) {
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, data, 'utf8');
  await rename(tempPath, path);
}

// Operación explícita (`npm run podcast:refresh`): incorpora al registro los
// GUID nuevos, resuelve todos los slugs y actualiza registro + snapshot de
// forma coherente. Nunca elimina entradas: un slug publicado queda reservado
// aunque el episodio salga del feed. Escribe solo cuando todo ha validado, y
// primero el registro: si algo interrumpe la escritura, el estado restante
// (registro nuevo + snapshot anterior) sigue siendo publicable.
export async function refreshFeed({
  feedUrl = DEFAULT_FEED_URL,
  snapshotPath = DEFAULT_SNAPSHOT_PATH,
  registryPath = DEFAULT_REGISTRY_PATH,
  timeoutMs = FEED_TIMEOUT_MS,
  fetchImpl = fetch,
  log = console,
} = {}) {
  const { feed, fetchedAt } = await fetchRemoteFeed({ feedUrl, timeoutMs, fetchImpl });
  const registry = await loadRegistry(registryPath);
  const slugs = { ...registry.slugs };
  const reserved = new Set(Object.values(slugs));
  const assigned = [];

  for (const episode of feed.episodes) {
    if (slugs[episode.guid]) continue;
    const slug = assignNewSlug(episode.title, reserved);
    slugs[episode.guid] = slug;
    reserved.add(slug);
    assigned.push({ guid: episode.guid, title: episode.title, slug });
  }

  const episodes = feed.episodes.map((episode) => ({
    ...episode,
    slug: slugs[episode.guid],
  }));
  const result = { episodes, meta: feed.meta };
  assertValidFeed(result, 'el feed resuelto');

  const snapshot = {
    captured_at: fetchedAt.toISOString(),
    feed_url: feedUrl,
    episodes,
    meta: feed.meta,
  };

  await writeAtomic(registryPath, `${JSON.stringify({ version: REGISTRY_VERSION, slugs }, null, 2)}\n`);
  await writeAtomic(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  if (assigned.length) {
    log.log(`[podcast] Nuevos episodios registrados: ${assigned.map((item) => `«${item.title}» → /podcast/${item.slug}/`).join(', ')}`);
  }
  log.log(`Registro de slugs actualizado (${Object.keys(slugs).length} episodios registrados, ${assigned.length} nuevos). Snapshot: ${snapshotPath}`);
  return { total: episodes.length, assigned, registry: { version: REGISTRY_VERSION, slugs } };
}

// Punto de entrada: feed remoto con fallback al snapshot last-known-good y
// resolución de identidad contra el registro. Devuelve
// `{ episodes, meta, source }` donde source es 'remote' o 'snapshot'.
// Nunca escribe archivos y nunca devuelve un podcast vacío: si no hay fuente
// válida, lanza. Los GUID nuevos del remoto NO se publican con URLs
// provisionales: se avisan y quedan pendientes de `podcast:refresh`.
export async function loadFeed({
  feedUrl = DEFAULT_FEED_URL,
  snapshotPath = DEFAULT_SNAPSHOT_PATH,
  registryPath = DEFAULT_REGISTRY_PATH,
  timeoutMs = FEED_TIMEOUT_MS,
  fetchImpl = fetch,
  log = console,
} = {}) {
  let source;
  let feed;
  try {
    const remote = await fetchRemoteFeed({ feedUrl, timeoutMs, fetchImpl });
    source = 'remote';
    feed = remote.feed;
  } catch (remoteError) {
    const remoteReason = remoteError?.message ?? String(remoteError);
    try {
      feed = await loadSnapshot(snapshotPath);
      source = 'snapshot';
      const capturedAt = feed.capturedAt instanceof Date && !Number.isNaN(feed.capturedAt.getTime())
        ? feed.capturedAt.toISOString()
        : 'fecha desconocida';
      log.warn(
        `[podcast] El feed remoto no está disponible (${remoteReason}). ` +
        `Construyendo con el snapshot last-known-good (${capturedAt}), que NO es el feed actual.`,
      );
    } catch (snapshotError) {
      const snapshotReason = snapshotError?.message ?? String(snapshotError);
      throw new Error(
        `No se pudo construir el podcast: el feed remoto falló (${remoteReason}) ` +
        `y no hay un snapshot válido (${snapshotReason}).`,
      );
    }
  }

  const registry = await loadRegistry(registryPath);
  const { episodes, unknown } = resolveEpisodes(feed.episodes, registry);
  if (unknown.length) {
    log.warn(
      `[podcast] ${unknown.length} episodio(s) de la fuente ${source} aún sin identidad registrada ` +
      `y por tanto SIN URL pública: ${unknown.map((item) => `«${item.title}»`).join(', ')}. ` +
      `Ejecuta npm run podcast:refresh para incorporarlos.`,
    );
  }
  if (!episodes.length) {
    throw new Error(
      'No hay ningún episodio registrado en el registro de slugs; ' +
      'ejecuta npm run podcast:refresh con un feed válido antes de construir.',
    );
  }
  return { episodes, meta: feed.meta, source };
}
