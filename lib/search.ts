/**
 * Shared text matching for list-page search.
 *
 * Deliberately forgiving: operators type "hino", "HINO-1234" or "rahim yar"
 * and expect a hit either way, so matching is case-insensitive, accent-folded,
 * whitespace-collapsed, and every whitespace-separated token must appear
 * somewhere in the record (AND, not exact-phrase).
 */

/** Lowercase, strip accents, collapse runs of whitespace. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Read and clean a `?q=` value coming off searchParams. */
export function parseQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, 100);
}

/**
 * True when every token in `query` appears in at least one of `fields`.
 * An empty query matches everything, so callers can pass it through unguarded.
 */
export function matches(
  query: string,
  ...fields: (string | number | null | undefined)[]
): boolean {
  const q = normalize(query);
  if (!q) return true;

  const haystack = normalize(
    fields.filter((f) => f !== null && f !== undefined).join(" "),
  );

  return q.split(" ").every((token) => haystack.includes(token));
}

/** Convenience filter for a list of records. */
export function filterBy<T>(
  items: T[],
  query: string,
  toFields: (item: T) => (string | number | null | undefined)[],
): T[] {
  if (!normalize(query)) return items;
  return items.filter((item) => matches(query, ...toFields(item)));
}
