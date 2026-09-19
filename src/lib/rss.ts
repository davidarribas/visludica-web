import {
  DEFAULT_FEED_URL,
  DEFAULT_SNAPSHOT_PATH,
  FEED_TIMEOUT_MS,
  loadFeed,
} from './podcast-feed.mjs';

export interface Episode {
  title: string;
  slug: string;
  captivateId: string;
  guid: string;
  pubDate: Date;
  duration: string;
  description: string;
  content: string;
  imageUrl: string;
  audioUrl: string;
}

export interface FeedMeta {
  title: string;
  description: string;
  imageUrl: string;
}

export type FeedSource = 'remote' | 'snapshot';

// La URL y el snapshot se pueden redirigir por entorno para construir sin
// acceso a Captivate (p. ej. PODCAST_FEED_URL=https://feeds.captivate.invalid/
// fuerza el camino de fallback con el snapshot last-known-good).
const feedUrl = process.env.PODCAST_FEED_URL ?? DEFAULT_FEED_URL;
const snapshotPath = process.env.PODCAST_SNAPSHOT_PATH ?? DEFAULT_SNAPSHOT_PATH;

// Una sola obtención por proceso: todas las páginas del build comparten este
// resultado, así el feed remoto se descarga como máximo una vez.
let _cache: Promise<{ episodes: Episode[]; meta: FeedMeta; source: FeedSource; fetchedAt?: Date }> | null = null;

async function getFeed() {
  if (!_cache) {
    _cache = loadFeed({ feedUrl, snapshotPath, timeoutMs: FEED_TIMEOUT_MS });
  }
  return _cache;
}

export async function getEpisodes(): Promise<Episode[]> {
  const { episodes } = await getFeed();
  return episodes as Episode[];
}

export async function getFeedMeta(): Promise<FeedMeta> {
  const { meta } = await getFeed();
  return meta as FeedMeta;
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | undefined> {
  const episodes = await getEpisodes();
  return episodes.find((ep) => ep.slug === slug);
}

export function paginateEpisodes(
  episodes: Episode[],
  page: number,
  pageSize = 24
): { items: Episode[]; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(episodes.length / pageSize);
  const start = (page - 1) * pageSize;
  return {
    items: episodes.slice(start, start + pageSize),
    totalPages,
    currentPage: page,
  };
}
