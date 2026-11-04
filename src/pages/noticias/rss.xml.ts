import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { SITE } from '../../config';
import { sortNewsByPublishedAt } from '../../lib/news';

// Feed RSS exclusivo de noticias. Lo consumen lectores RSS y, en el futuro, la
// automatización que difunde cada noticia nueva (Telegram). La imagen va como
// <enclosure> para que esos consumidores no tengan que raspar la página.
export const NEWS_FEED_SIZE = 50;

const publicDir = resolve(process.env.ASTRO_NEWS_PUBLIC_DIR ?? './public');
const imageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
};

function enclosureFor(src: string, site: URL) {
  const type = imageTypes[extname(src).toLowerCase()];
  if (!type) return undefined;
  return { url: new URL(src, site).href, length: statSync(resolve(publicDir, src.slice(1))).size, type };
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site ?? new URL(SITE.url);
  const items = sortNewsByPublishedAt(await getCollection('news')).slice(0, NEWS_FEED_SIZE);

  return rss({
    title: `${SITE.name} — Noticias`,
    description: 'Noticias de juegos de mesa publicadas en Vis Ludica.',
    site: siteUrl,
    trailingSlash: true,
    customData: '<language>es-ES</language>',
    items: items.map((news) => ({
      title: news.data.title,
      link: `/noticias/${news.id}/`,
      pubDate: news.data.published_at,
      description: news.data.summary,
      categories: news.data.tags,
      enclosure: news.data.image ? enclosureFor(news.data.image.src, siteUrl) : undefined,
    })),
  });
};
