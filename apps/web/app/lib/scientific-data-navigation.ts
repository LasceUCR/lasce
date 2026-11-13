import {
  rosacInstruments,
  scientificDataQuerySchema,
  type ScientificDataQuery,
} from './scientific-data'
import { getAvailabilityMessage } from './scientific-data-availability'

const QUERY_KEYS = ['source', 'product', 'parameter', 'date', 'startTime', 'endTime'] as const

interface ScientificNavigationParams {
  source?: string | string[]
  instrument?: string | string[]
}

/** ROSAC links only select existing simulations; unknown or repeated parameters use GOES. */
export function getInitialScientificQuery(
  params: ScientificNavigationParams,
  date: string,
): ScientificDataQuery {
  const fallback: ScientificDataQuery = {
    source: 'GOES',
    product: 'SFXR',
    parameter: '0.1-0.8nm',
    date,
    startTime: '00:00',
    endTime: '23:59',
  }

  if (params.source !== 'ROSAC') return fallback

  const instrument =
    params.instrument === undefined
      ? rosacInstruments[0]
      : rosacInstruments.find((candidate) => candidate.code === params.instrument)
  const product = instrument?.products.find((candidate) => candidate.available)
  if (!product) return fallback

  return {
    ...fallback,
    source: 'ROSAC',
    product: product.code,
    parameter: product.parameters[0]!.code,
  }
}

/** The `/datos` URL that reopens `query`, with the same keys `/api/scientific-data` reads. */
export function scientificDataHref(query: ScientificDataQuery): string {
  return `/datos?${new URLSearchParams(QUERY_KEYS.map((key) => [key, query[key]]))}`
}

/**
 * A complete query written by `scientificDataHref`, for the page to run again on load (for
 * example after a visitor signs in to download its graph). Anything missing, repeated, invalid
 * or in the future for GOES gives `null`.
 */
export function getRequestedScientificQuery(
  params: Record<string, string | string[] | undefined>,
  maxDate: string,
): ScientificDataQuery | null {
  const values = QUERY_KEYS.map((key) => [key, params[key]] as const)
  if (values.some(([, value]) => typeof value !== 'string')) return null

  const parsed = scientificDataQuerySchema.safeParse(Object.fromEntries(values))
  if (!parsed.success) return null
  if (getAvailabilityMessage(parsed.data, { today: maxDate }, 'future')) return null
  return parsed.data
}

/** Points a sign-in link's `next` at `query`, so login returns to the same consultation. */
export function withQueryReturn(loginHref: string, query: ScientificDataQuery): string {
  const [path, search = ''] = loginHref.split('?', 2)
  const params = new URLSearchParams(search)
  if (!params.has('next')) return loginHref
  params.set('next', scientificDataHref(query))
  return `${path}?${params}`
}
