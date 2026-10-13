import { rosacInstruments, type ScientificDataQuery } from './scientific-data'

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
