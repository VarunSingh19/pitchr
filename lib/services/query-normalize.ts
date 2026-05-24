/**
 * Query normalization utility for Leads Discovery cache key matching.
 *
 * Ensures that semantically-equivalent queries like "React dev Mumbai" and
 * "react developer mumbai" produce the same normalized string, improving
 * cache hit rates across users.
 */

// Exact synonym map — no AI-inferred synonyms beyond this list
const SYNONYMS: Record<string, string> = {
  'dev': 'developer',
  'devs': 'developer',
  'eng': 'engineer',
  'engg': 'engineer',
  'reactjs': 'react',
  'vuejs': 'vue',
  'nodejs': 'node',
  'sr': 'senior',
  'jr': 'junior',
  'mgr': 'manager',
  'mngr': 'manager',
};

/**
 * Normalize a search query for cache key matching.
 *
 * Pipeline:
 *  1. Lowercase + trim
 *  2. Replace synonyms
 *  3. Remove non-alphanumeric characters (except spaces)
 *  4. Collapse whitespace
 *  5. Sort tokens alphabetically
 *
 * @param query - The raw search query string
 * @returns Normalized query string suitable as a cache key
 */
export function normalizeQuery(query: string): string {
  if (!query) return "";

  let q = query.toLowerCase().trim();

  // Remove special characters except spaces
  q = q.replace(/[^\w\s]/g, "");

  // Collapse multiple spaces
  q = q.replace(/\s+/g, " ").trim();

  // Tokenize
  const tokens = q.split(" ");

  // Apply synonyms
  const mapped = tokens.map((token) => SYNONYMS[token] || token);

  // Sort alphabetically for order-independent matching
  mapped.sort();

  return mapped.join(" ");
}

/**
 * Normalize a combined query + location pair.
 * Returns a single string suitable as a compound cache key.
 *
 * @param query - The search query (e.g. "React Developer")
 * @param location - The location filter (e.g. "Mumbai")
 * @returns Normalized compound key
 */
export function normalizeQueryWithLocation(
  query: string,
  location: string
): string {
  const nq = normalizeQuery(query);
  const nl = normalizeQuery(location);
  return nl ? `${nq}|${nl}` : nq;
}
