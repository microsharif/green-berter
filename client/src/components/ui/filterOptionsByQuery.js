/**
 * Client-side filter for combobox options (name + optional extra haystack).
 *
 * @param {Array<{ name: string, searchHaystack?: string }>} options
 * @param {string} query
 * @param {{ limit?: number, showAllWhenEmpty?: boolean }} [opts]
 */
export function filterOptionsByQuery(
  options,
  query,
  { limit = 60, showAllWhenEmpty = true } = {}
) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return showAllWhenEmpty ? options.slice(0, limit) : [];
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  return options
    .filter((opt) => {
      const hay = (opt.searchHaystack ?? opt.name ?? "").toLowerCase();
      return tokens.every((token) => hay.includes(token));
    })
    .slice(0, limit);
}
