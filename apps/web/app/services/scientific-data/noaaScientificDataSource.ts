import { z } from 'zod'

import {
  findScientificProduct,
  type ImageSequenceDataResult,
  type ScientificDataQuery,
  type ScientificDataResult,
  type ScientificParameter,
} from '@/app/lib/scientific-data'

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'
const MAX_SUVI_IMAGES = 8

export class ScientificDataUpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScientificDataUpstreamError'
  }
}

async function fetchNoaaJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${NOAA_BASE_URL}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new ScientificDataUpstreamError('NOAA no respondió a la consulta.')
  }

  if (!response.ok) {
    throw new ScientificDataUpstreamError(`NOAA respondió con el estado ${response.status}.`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ScientificDataUpstreamError('NOAA devolvió una respuesta incompleta o no válida.')
  }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ScientificDataUpstreamError('NOAA devolvió datos con un formato inesperado.')
  }

  return parsed.data
}

function queryBounds(query: ScientificDataQuery) {
  return {
    start: Date.parse(`${query.date}T${query.startTime}:00Z`),
    end: Date.parse(`${query.date}T${query.endTime}:59Z`),
  }
}

function selectEvenly<T>(items: T[], maximum: number): T[] {
  if (items.length <= maximum) return items

  return Array.from({ length: maximum }, (_, index) => {
    const sourceIndex = Math.round((index * (items.length - 1)) / (maximum - 1))
    return items[sourceIndex]!
  })
}

const suviChannels: Record<string, string> = {
  Fe093: '094',
  Fe131: '131',
  Fe171: '171',
  Fe195: '195',
  Fe284: '284',
  He303: '304',
}

function parseSuviImage(path: string, productName: string) {
  const match = path.match(/_g(\d+)_s(\d{8}T\d{6})Z_/)
  if (!match) return null

  const [, satelliteText, compactTimestamp] = match
  const timestamp = compactTimestamp!.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
    '$1-$2-$3T$4:$5:$6Z',
  )
  const satellite = Number(satelliteText)

  return {
    timestamp,
    satellite,
    imageUrl: new URL(path, NOAA_BASE_URL).toString(),
    alt: `${productName} observada por GOES-${satellite} a las ${timestamp.slice(11, 16)} UTC`,
  }
}

async function querySuvi(
  query: ScientificDataQuery,
  parameter: ScientificParameter,
): Promise<ImageSequenceDataResult> {
  const selection = findScientificProduct(query.source, query.product)!
  const channel = suviChannels[query.product]!
  const index = await fetchNoaaJson(
    `/products/animations/suvi-primary-${channel}.json`,
    z.array(z.object({ url: z.string() })),
  )
  const { start, end } = queryBounds(query)
  const parsedImages = index
    .map(({ url }) => parseSuviImage(url, selection.product.name))
    .filter((image): image is NonNullable<typeof image> => image !== null)
    .filter(({ timestamp }) => {
      const instant = Date.parse(timestamp)
      return instant >= start && instant <= end
    })
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
  const images = selectEvenly(parsedImages, MAX_SUVI_IMAGES)

  return {
    query,
    instrument: { code: selection.instrument.code, name: selection.instrument.name },
    product: { code: selection.product.code, name: selection.product.name },
    parameter,
    origin: {
      kind: 'observed',
      provider: 'NOAA Space Weather Prediction Center',
      notice:
        'Imágenes observadas del producto de animación SUVI primario de NOAA. Este índice cubre aproximadamente las últimas 24 horas.',
      ...(images[0]?.satellite ? { satellite: images[0].satellite } : {}),
    },
    visualization: 'image-sequence',
    images: images.map(({ satellite: _satellite, ...image }) => image),
  }
}

export async function queryNoaaScientificData(
  query: ScientificDataQuery,
): Promise<ScientificDataResult> {
  const selection = findScientificProduct(query.source, query.product)
  if (
    !selection ||
    query.source !== 'GOES' ||
    selection.product.visualization !== 'image-sequence'
  ) {
    throw new Error('The NOAA source only accepts SUVI images')
  }

  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === query.parameter,
  )!

  return querySuvi(query, parameter)
}
