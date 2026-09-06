export const gameTypeLabels = {
  base_game: "Juego base",
  expansion: "Expansión",
  accessory: "Accesorio",
};

export function formatNewsDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid",
  }).format(date);
}

export function formatPlayers(product) {
  if (product.players_min === undefined) return undefined;
  const max = product.players_max;
  const value = max === undefined ? `${product.players_min}+`
    : max === product.players_min ? `${product.players_min}` : `${product.players_min}–${max}`;
  return `${value} ${product.players_min === 1 && max === 1 ? "jugador" : "jugadores"}`;
}

export function formatDuration(product) {
  if (product.duration_min === undefined) return undefined;
  const max = product.duration_max;
  const value = max === undefined || max === product.duration_min
    ? `${product.duration_min}` : `${product.duration_min}–${max}`;
  return `${value} min`;
}

export function formatPrice(price) {
  if (price === undefined) return undefined;
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(price);
}

export function formatProductContext(products) {
  if (products.length === 1) return products[0].parent ?? products[0].name;
  const parents = [...new Set(products.map(({ parent }) => parent).filter(Boolean))];
  const count = `${products.length} productos`;
  return parents.length === 1 ? `${parents[0]} · ${count}` : count;
}
