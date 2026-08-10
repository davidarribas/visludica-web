import type { APIRoute } from 'astro';
import { getEpisodes } from '../../lib/rss';

// Índice de episodios para el buscador en cliente de /podcast.
// Se genera una vez en build; el resumen se trunca a ~200 caracteres.
export const GET: APIRoute = async () => {
  const episodes = await getEpisodes();

  const data = episodes.map((ep) => ({
    titulo: ep.title,
    slug: ep.slug,
    fecha: ep.pubDate.toISOString(),
    duracion: ep.duration,
    resumen:
      ep.description.length > 200
        ? ep.description.slice(0, 197).trim() + '…'
        : ep.description,
  }));

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
