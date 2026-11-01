// Free of server-only imports: the publications page and `PublicationsExplorer` share these.
// The page and the search use the shared listing helpers; the research group is this listing's
// own filter, kept in the URL so the database applies it before it cuts the page.

import { isListingUrl, listingHref, type ListingState, type SearchParamValue } from './pagination'
import type { ResearchGroup } from './publication-schema'

/** The query string parameter that carries the research group, as in `/publicaciones?group=LASCE`. */
export const GROUP_PARAM = 'group'

/**
 * The group a `?group=` value asks for. Only `LASCE` and `ROSAC` name one. Anything else
 * (absent, empty, repeated, any other text) asks for every group.
 */
export function parseGroupParam(value: SearchParamValue): ResearchGroup | null {
  return value === 'LASCE' || value === 'ROSAC' ? value : null
}

export interface PublicationListingState extends ListingState {
  /** `null` for every group. */
  group?: ResearchGroup | null
}

/**
 * The URL of `/publicaciones` showing `page` of the results for `query` in `group`, as in
 * `/publicaciones?q=sol&group=LASCE&page=2`. Page 1, an empty search and "every group" are left
 * out, so the plain listing keeps its plain URL.
 */
export function publicationListingHref(
  pathname: string,
  { query = '', page = 1, group = null }: PublicationListingState,
): string {
  const href = listingHref(pathname, { query, page })
  if (group === null) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${GROUP_PARAM}=${group}`
}

/**
 * Whether the query string already says exactly what is shown. A group that is not `LASCE` or
 * `ROSAC`, or one left in the URL when every group is shown, is not: the page redirects to the
 * URL `publicationListingHref` would write.
 */
export function isPublicationListingUrl(
  params: Readonly<Record<string, SearchParamValue>>,
  shown: PublicationListingState,
): boolean {
  if (!isListingUrl(params, shown)) return false

  const group = shown.group ?? null
  const value = params[GROUP_PARAM]
  return group === null ? value === undefined : value === group
}
