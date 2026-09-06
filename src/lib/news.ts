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

export interface NewsCardViewModel {
  slug: string;
  title: string;
  summary: string;
  productContext: string;
  image?: { src: string; alt: string };
}

export function toNewsCardViewModel(news: NewsEntry): NewsCardViewModel {
  return {
    slug: news.id,
    title: news.data.title,
    summary: news.data.summary,
    productContext: formatProductContext(news.data.products),
    image: news.data.image,
  };
}
