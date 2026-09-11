import type { APIRoute } from 'astro';
import { buildSearchText } from '../../lib/archive-search.mjs';
import { getEpisodes } from '../../lib/rss';

// Índice de episodios para el buscador en cliente de /podcast.
// Se genera una vez en build y nunca contiene resultados de otras secciones.
export const GET: APIRoute = async () => {
  const episodes = await getEpisodes();

  const data = episodes.map((ep) => {
    const description =
      ep.description.length > 200
        ? ep.description.slice(0, 197).trim() + '…'
        : ep.description;

    return {
      title: ep.title,
      href: `/podcast/${ep.slug}`,
      date: ep.pubDate.toISOString(),
      description,
      searchText: buildSearchText(ep.title, description),
    };
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
