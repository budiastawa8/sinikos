/** Normalisasi query pencarian daftar. */
export function normalizeSearch(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Cocokkan haystack bebas terhadap query yang sudah dinormalisasi. */
export function matchesSearch(haystack: string, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return haystack.toLowerCase().includes(normalizedQuery);
}
