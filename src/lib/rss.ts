import { XMLParser } from 'fast-xml-parser';

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

const RSS_URL = 'https://feeds.captivate.fm/visludica/';

// Normaliza duración a "Xh Ym" o "Ym Zs"
function formatDuration(raw: string | number | undefined): string {
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

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extrae el ID UUID del GUID de Captivate
function extractCaptivateId(guid: string): string {
  // Formato típico: UUID o URL terminando en UUID
  const uuidMatch = guid.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch ? uuidMatch[0] : guid;
}

let _cache: { episodes: Episode[]; meta: FeedMeta } | null = null;

async function fetchFeed() {
  if (_cache) return _cache;

  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'item',
    parseAttributeValue: false,
  });

  const feed = parser.parse(xml);
  const channel = feed?.rss?.channel ?? {};
  const items: any[] = channel.item ?? [];

  const meta: FeedMeta = {
    title: channel.title ?? 'Vis Lúdica',
    description: channel.description ?? '',
    imageUrl:
      channel['itunes:image']?.['@_href'] ??
      channel.image?.url ??
      '',
  };

  const slugCount: Record<string, number> = {};

  const episodes: Episode[] = items.map((item: any): Episode => {
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

  _cache = { episodes, meta };
  return _cache;
}

export async function getEpisodes(): Promise<Episode[]> {
  const { episodes } = await fetchFeed();
  return episodes;
}

export async function getFeedMeta(): Promise<FeedMeta> {
  const { meta } = await fetchFeed();
  return meta;
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
