import {
  findScientificProduct,
  type ScientificDataPoint,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

export interface GoesTimeSeriesOrigin {
  provider: string
  notice: string
  satellite: number | null
}

/**
 * Shapes observed GOES points into the public result, whichever backend read them (the CITIC
 * worker today, a database later), so provenance is described the same way.
 */
export function buildGoesTimeSeriesResult(
  query: ScientificDataQuery,
  points: ScientificDataPoint[],
  origin: GoesTimeSeriesOrigin,
): TimeSeriesDataResult {
  const selection = findScientificProduct(query.source, query.product)
  if (query.source !== 'GOES' || !selection || selection.product.visualization !== 'time-series') {
    throw new Error('Only GOES time series can be shaped as a GOES time-series result')
  }
  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === query.parameter,
  )
  if (!parameter) {
    throw new Error(`Unknown parameter ${query.parameter} for GOES product ${query.product}`)
  }

  return {
    query,
    instrument: { code: selection.instrument.code, name: selection.instrument.name },
    product: { code: selection.product.code, name: selection.product.name },
    parameter,
    visualization: 'time-series',
    points,
    origin: {
      kind: 'observed',
      provider: origin.provider,
      notice: origin.notice,
      ...(origin.satellite ? { satellite: origin.satellite } : {}),
    },
  }
}
