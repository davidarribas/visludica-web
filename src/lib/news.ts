import type { CollectionEntry } from "astro:content";
import {
  formatDuration, formatNewsDate, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels, newsEventLabels,
} from "./news-model.mjs";

export {
  formatDuration, formatNewsDate, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels, newsEventLabels,
};

export type NewsEntry = CollectionEntry<"news">;
export type NewsProduct = NewsEntry["data"]["products"][number];

export interface NewsCardViewModel {
  slug: string;
  title: string;
  summary: string;
  date?: Date;
  eventLabel: string;
  productContext: string;
  image?: { src: string; alt: string };
}

export function toNewsCardViewModel(news: NewsEntry): NewsCardViewModel {
  return {
    slug: news.data.slug,
    title: news.data.title,
    summary: news.data.summary,
    date: news.data.date,
    eventLabel: newsEventLabels[news.data.event],
    productContext: formatProductContext(news.data.products),
    image: news.data.image,
  };
}
