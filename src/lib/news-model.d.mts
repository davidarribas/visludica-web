import type { NewsProduct } from "./news";

export const gameTypeLabels: Record<NewsProduct["type"], string>;
export function formatNewsDate(date: Date): string;
export function formatPlayers(product: NewsProduct): string | undefined;
export function formatDuration(product: NewsProduct): string | undefined;
export function formatPrice(price?: number): string | undefined;
export function formatProductContext(products: NewsProduct[]): string;
