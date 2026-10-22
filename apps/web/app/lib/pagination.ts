// Free of server-only imports: the page that reads `?page=` and the component that renders the
// controls both use these, and so does any other listing that paginates.

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
