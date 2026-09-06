export const organizationRoleLabels: {
  readonly spanish_publisher: "Editorial";
  readonly distributor: "Distribución";
  readonly original_publisher: "Editorial original";
};

export const gameTypeLabels: {
  readonly base_game: "Juego base";
  readonly expansion: "Expansión";
  readonly accessory: "Accesorio";
};

export const creditRoleLabels: {
  readonly designer: "Diseño";
  readonly developer: "Desarrollo";
  readonly system_designer: "Diseño del sistema";
};

export const newsEventLabels: {
  readonly announcement: "Anuncio";
  readonly preorder: "Preventa";
  readonly release: "Lanzamiento";
  readonly restock: "Reposición";
  readonly reprint: "Reimpresión";
  readonly new_edition: "Nueva edición";
  readonly crowdfunding: "Financiación colectiva";
  readonly delay: "Retraso";
  readonly cancellation: "Cancelación";
  readonly date_change: "Cambio de fecha";
  readonly content_change: "Cambio de contenido";
};

export function resolveNewsGraph(
  news: unknown,
  lookup: (reference: { collection: string; id: string }) => unknown | Promise<unknown>,
): Promise<unknown>;

export function formatNewsDate(date: Date): string;
export function formatPartialDate(partialDate?: {
  value?: string;
  precision: "day" | "month" | "quarter" | "year" | "unknown";
}): string | undefined;
export function formatPlayers(players?: { min: number; max?: number }): string | undefined;
export function formatDuration(duration?: { min: number; max: number }): string | undefined;
export function formatPriceSnapshot(snapshot?: {
  amount_minor: number;
  currency: string;
}): string | undefined;
export function formatProductContext(contextGameTitles: string[], productCount: number): string;
