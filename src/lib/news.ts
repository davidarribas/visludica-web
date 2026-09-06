import type { CollectionEntry } from "astro:content";
import {
  formatDuration, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels,
} from "./news-model.mjs";

export {
  formatDuration, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels,
};

export type NewsEntry = CollectionEntry<"news">;
export type NewsProduct = NewsEntry["data"]["products"][number];

export const NEWS_PAGE_SIZE = 20;

export interface NewsCardViewModel {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  publishedDate: string;
  productContext: string;
  image?: { src: string; alt: string };
}

const publishedDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export function formatPublishedDate(publishedAt: Date): string {
  return publishedDateFormatter.format(publishedAt);
}

export function toNewsCardViewModel(news: NewsEntry): NewsCardViewModel {
  return {
    slug: news.id,
    title: news.data.title,
    summary: news.data.summary,
    publishedAt: news.data.published_at.toISOString(),
    publishedDate: formatPublishedDate(news.data.published_at),
    productContext: formatProductContext(news.data.products),
    image: news.data.image,
  };
}

export function sortNewsByPublishedAt(newsEntries: NewsEntry[]): NewsEntry[] {
  return [...newsEntries].sort(
    (first, second) =>
      second.data.published_at.getTime() - first.data.published_at.getTime(),
  );
}

export function paginateNews(
  newsEntries: NewsEntry[],
  page: number,
  pageSize = NEWS_PAGE_SIZE,
): { items: NewsEntry[]; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(newsEntries.length / pageSize);
  const start = (page - 1) * pageSize;

  return {
    items: newsEntries.slice(start, start + pageSize),
    totalPages,
    currentPage: page,
  };
}
