import { getEntry, type CollectionEntry } from "astro:content";
import {
  creditRoleLabels,
  formatDuration,
  formatNewsDate,
  formatPartialDate,
  formatPlayers,
  formatPriceSnapshot,
  formatProductContext,
  gameTypeLabels,
  newsEventLabels,
  organizationRoleLabels,
  resolveNewsGraph,
} from "./news-model.mjs";

export {
  creditRoleLabels,
  formatDuration,
  formatNewsDate,
  formatPartialDate,
  formatPlayers,
  formatPriceSnapshot,
  formatProductContext,
  gameTypeLabels,
  newsEventLabels,
  organizationRoleLabels,
};

export type NewsEntry = CollectionEntry<"news">;
type GameEntry = CollectionEntry<"games">;
type VersionEntry = CollectionEntry<"versions">;
type OrganizationEntry = CollectionEntry<"organizations">;

export interface PartialDate {
  value?: string;
  precision: "day" | "month" | "quarter" | "year" | "unknown";
}

export interface PriceSnapshot {
  kind: "pvpr" | "reservation_deposit";
  amount_minor: number;
  currency: string;
  market: string;
  observed_at: string;
}

export interface ResolvedNewsProduct {
  position: number;
  heading: string;
  game: GameEntry;
  version: VersionEntry;
  organizations: Array<{
    entry: OrganizationEntry;
    role: "spanish_publisher" | "distributor" | "original_publisher";
  }>;
  facts: {
    players?: { min: number; max?: number };
    durationMinutes?: { min: number; max: number };
    recommendedAgeMin?: number;
    credits?: Array<{
      name: string;
      role: "designer" | "developer" | "system_designer";
    }>;
    spanishPublisher?: string;
    releaseDate?: PartialDate;
    priceSnapshot?: PriceSnapshot;
  };
}

export interface ResolvedNews {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt?: Date;
  effectiveDate?: PartialDate;
  eventType:
    | "announcement"
    | "preorder"
    | "release"
    | "restock"
    | "reprint"
    | "new_edition"
    | "crowdfunding"
    | "delay"
    | "cancellation"
    | "date_change"
    | "content_change";
  image?: string;
  bodyMarkdown: string;
  productCount: number;
  contextGameTitles: string[];
  products: ResolvedNewsProduct[];
  groupPriceSnapshot?: PriceSnapshot;
}

/** Resolve persisted News V1/V2 to one renderer-facing view model. */
export async function resolveNews(news: NewsEntry): Promise<ResolvedNews> {
  return (await resolveNewsGraph(news, (reference: { collection: string; id: string }) =>
    getEntry(reference as Parameters<typeof getEntry>[0]),
  )) as ResolvedNews;
}

export interface NewsCardViewModel {
  slug: string;
  title: string;
  summary: string;
  publishedAt?: Date;
  eventLabel: string;
  productContext: string;
  image?: string;
}

export function toNewsCardViewModel(resolved: ResolvedNews): NewsCardViewModel {
  return {
    slug: resolved.slug,
    title: resolved.title,
    summary: resolved.summary,
    publishedAt: resolved.publishedAt,
    eventLabel: newsEventLabels[resolved.eventType],
    productContext: formatProductContext(resolved.contextGameTitles, resolved.productCount),
    image: resolved.image,
  };
}
