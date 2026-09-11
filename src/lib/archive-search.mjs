export function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function buildSearchText(...values) {
  return normalizeSearch(values.flat(Infinity).filter(Boolean).join(" "));
}

export function matchesSearch(searchText, query) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;

  const normalizedText = normalizeSearch(searchText);
  return terms.every((term) => normalizedText.includes(term));
}
