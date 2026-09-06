import type { CollectionEntry } from "astro:content";
import {
  formatDuration, formatNewsDate, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels,
} from "./news-model.mjs";

export {
  formatDuration, formatNewsDate, formatPlayers, formatPrice, formatProductContext,
  gameTypeLabels,
};

export type NewsEntry = CollectionEntry<"news">;
export type NewsProduct = NewsEntry["data"]["products"][number];

export interface NewsCardViewModel {
  slug: string;
  title: string;
  summary: string;
  date?: Date;
  productContext: string;
  image?: { src: string; alt: string };
}

export function toNewsCardViewModel(news: NewsEntry): NewsCardViewModel {
  return {
    slug: news.data.slug,
    title: news.data.title,
    summary: news.data.summary,
    date: news.data.date,
    productContext: formatProductContext(news.data.products),
    image: news.data.image,
  };
}
