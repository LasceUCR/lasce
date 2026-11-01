// Free of server-only imports: the page that reads `?page=` and the component that renders the
// controls both use these, and so does any other listing that paginates.

import { SEARCH_PARAM } from './search-query'

/** Items per page in every paginated listing. Visitors cannot change it. */
export const PAGE_SIZE = 10

/** The query string parameter that carries the page number, as in `/noticias?page=2`. */
export const PAGE_PARAM = 'page'

/** A query string value as Next.js passes it to a page: absent, once, or repeated. */
export type SearchParamValue = string | string[] | undefined

/**
 * The page a `?page=` value asks for, before it is checked against the number of pages.
 *
 * Only plain digits name a page. Anything else (absent, empty, repeated, `abc`, `1.5`, `-2`, `0`)
 * asks for page 1. A number too large to represent exactly asks for the largest one, which
 * `paginate` then brings down to the last page.
 */
export function parsePageParam(value: SearchParamValue): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1

  const page = Number(value)
  if (!Number.isSafeInteger(page)) return Number.MAX_SAFE_INTEGER

  return Math.max(page, 1)
}

export interface PageWindow {
  /** The page shown: the one asked for, brought within `1..totalPages`. Always at least 1. */
  page: number
  pageSize: number
  /** Items across every page, after any search filter. */
  totalItems: number
  /** `0` when there are no items: there is no page to show, and no page indicator either. */
  totalPages: number
  /** Rows to skip and to take in the query that loads `page`. */
  skip: number
  take: number
}

/**
 * Which slice of `totalItems` to load for the page asked for. A page below 1 (or not an integer)
 * becomes page 1, and a page past the end becomes the last page, so the page shown always exists
 * while there is at least one item.
 */
export function paginate(
  totalItems: number,
  requestedPage: number,
  pageSize: number = PAGE_SIZE,
): PageWindow {
  const totalPages = Math.ceil(Math.max(totalItems, 0) / pageSize)
  const asked = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1
  const page = Math.min(asked, Math.max(totalPages, 1))

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

/** A page number to link to, or a gap in the sequence that `Pagination` shows as `…`. */
export type PageItem = number | 'ellipsis'

/**
 * The page numbers to offer around `current`, out of `total`: every page when there are 7 or
 * fewer, otherwise always 7 items (the first page, the last, the current one and its neighbours,
 * with a gap where pages are left out), so the controls keep their width while moving.
 *
 * 12 pages, on page 6: `1 … 5 6 7 … 12`. On page 2: `1 2 3 4 5 … 12`.
 */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: Math.max(total, 0) }, (_, index) => index + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', total]
  if (current >= total - 3) {
    return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total]
}

export interface ListingState {
  /** Search text; `''` for none. */
  query?: string
  page?: number
}

/**
 * The URL of a listing at `pathname` showing `page` of the results for `query`, as in
 * `/noticias?q=sol&page=2`. Page 1 and an empty search are left out, so the plain listing keeps
 * its plain URL.
 */
export function listingHref(pathname: string, { query = '', page = 1 }: ListingState): string {
  const params = new URLSearchParams()
  if (query !== '') params.set(SEARCH_PARAM, query)
  if (page > 1) params.set(PAGE_PARAM, String(page))

  const search = params.toString()
  return search === '' ? pathname : `${pathname}?${search}`
}

/**
 * Whether the query string a listing was opened with already says exactly what is shown, as
 * `listingHref` would write it. When it does not (`?page=0`, `?page=99` past the end, `?q=` empty,
 * `?page=1`, a repeated parameter, text that was trimmed), the page redirects to that URL, so the
 * page shown and the URL never disagree.
 */
export function isListingUrl(
  params: Readonly<Record<string, SearchParamValue>>,
  { query = '', page = 1 }: ListingState,
): boolean {
  const queryValue = params[SEARCH_PARAM]
  const pageValue = params[PAGE_PARAM]

  const queryMatches = query === '' ? queryValue === undefined : queryValue === query
  const pageMatches = page === 1 ? pageValue === undefined : pageValue === String(page)

  return queryMatches && pageMatches
}
