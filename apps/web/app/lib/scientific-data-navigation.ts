import {
  findScientificProduct,
  rosacInstruments,
  type ScientificDataQuery,
} from './scientific-data'
import { getLatestAvailableDate, type GoesAvailability } from './scientific-data-availability'

interface ScientificNavigationParams {
  source?: string | string[]
  instrument?: string | string[]
}

const DEFAULT_GOES_PRODUCT = 'SFXR'

/**
 * ROSAC links only select existing simulations; unknown or repeated parameters use GOES. A GOES
 * query opens on the latest day that already has data for its instrument, not on today, so
 * pressing "Consultar datos" without changes returns data.
 */
export function getInitialScientificQuery(
  params: ScientificNavigationParams,
  availability: GoesAvailability,
): ScientificDataQuery {
  const defaultInstrument = findScientificProduct('GOES', DEFAULT_GOES_PRODUCT)!.instrument.code
  const fallback: ScientificDataQuery = {
    source: 'GOES',
    product: DEFAULT_GOES_PRODUCT,
    parameter: '0.1-0.8nm',
    date: getLatestAvailableDate(defaultInstrument, availability),
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
    date: availability.today,
    product: product.code,
    parameter: product.parameters[0]!.code,
  }
}
