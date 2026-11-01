// Free of server-only imports, like `pagination.ts`: the page and the search box share these.

import type { SearchParamValue } from './pagination'

/** The query string parameter that carries a listing's search text, as in `/noticias?q=sol`. */
export const SEARCH_PARAM = 'q'

/** Longer search text is cut to this many characters before it reaches the database. */
export const SEARCH_MAX_LENGTH = 100

/**
 * The search text a `?q=` value asks for: trimmed and cut to `SEARCH_MAX_LENGTH`. Absent or
 * repeated values, and text that is only whitespace, mean no search (`''`).
 */
export function parseSearchParam(value: SearchParamValue): string {
  if (typeof value !== 'string') return ''

  return value.trim().slice(0, SEARCH_MAX_LENGTH).trim()
}

/**
 * `value` for a Prisma `contains`, `startsWith` or `endsWith` filter on PostgreSQL, matched
 * literally. Prisma passes the text to `LIKE`/`ILIKE` as is, so a `%` or `_` in it would match
 * any text or any character; this escapes them, and the escape character `\` itself.
 */
export function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
