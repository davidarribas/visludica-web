import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { buildSearchText } from '../../lib/archive-search.mjs';
import {
  sortNewsByPublishedAt,
  toNewsCardViewModel,
} from '../../lib/news';

// Índice exclusivo de noticias para el buscador en cliente de /noticias.
// Se genera durante el build y conserva el mismo orden que el archivo.
export const GET: APIRoute = async () => {
  const newsEntries = sortNewsByPublishedAt(await getCollection('news'));

  const data = newsEntries.map((entry) => {
    const viewModel = toNewsCardViewModel(entry);
    const productTerms = entry.data.products.flatMap((product) => [
      product.name,
      product.parent,
      product.designers,
      product.publisher_es,
      product.distributor_es,
    ]);

    return {
      title: viewModel.title,
      href: `/noticias/${viewModel.slug}`,
      date: viewModel.publishedAt,
      description: viewModel.summary,
      meta: viewModel.productContext,
      searchText: buildSearchText(
        viewModel.title,
        viewModel.summary,
        entry.body,
        entry.data.tags,
        productTerms,
      ),
    };
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
