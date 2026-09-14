import { z } from 'zod'

import {
  findScientificProduct,
  type ImageSequenceDataResult,
  type ScientificDataPoint,
  type ScientificDataQuery,
  type ScientificDataResult,
  type ScientificParameter,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'
const MAX_CHART_POINTS = 360
const MAX_SUVI_IMAGES = 8

const xrayReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number().int(),
  flux: z.number().nullable(),
  energy: z.string(),
})

const euvReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number().int(),
  line: z.string(),
  value: z.number().nullable(),
})

const magnetometerReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number().int(),
  Hp: z.number().nullable(),
  He: z.number().nullable(),
  Hn: z.number().nullable(),
  total: z.number().nullable(),
})

const particleReadingSchema = z.object({
  time_tag: z.string(),
  satellite: z.number().int(),
  flux: z.number().nullable(),
  energy: z.string(),
  channel: z.string().optional(),
})

const suviImageSchema = z.object({ url: z.string() })

type XrayReading = z.infer<typeof xrayReadingSchema>
type EuvReading = z.infer<typeof euvReadingSchema>
type MagnetometerReading = z.infer<typeof magnetometerReadingSchema>
type ParticleReading = z.infer<typeof particleReadingSchema>

interface NormalizedReading {
  timestamp: string
  value: number | null
  satellite: number
}

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

function filterReadings(query: ScientificDataQuery, readings: NormalizedReading[]) {
  const { start, end } = queryBounds(query)
  const filtered = readings
    .filter(({ timestamp, value }) => {
      const instant = Date.parse(timestamp)
      return value !== null && Number.isFinite(value) && instant >= start && instant <= end
    })
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))

  const allPoints: ScientificDataPoint[] = filtered.map(({ timestamp, value }) => ({
    timestamp,
    value: value!,
  }))

  return {
    points: selectEvenly(allPoints, MAX_CHART_POINTS),
    satellite:
      new Set(filtered.map((reading) => reading.satellite)).size === 1
        ? filtered[0]?.satellite
        : undefined,
    wasSampled: allPoints.length > MAX_CHART_POINTS,
  }
}

function buildTimeSeriesResult(
  query: ScientificDataQuery,
  parameter: ScientificParameter,
  readings: NormalizedReading[],
): TimeSeriesDataResult {
  const selection = findScientificProduct(query.source, query.product)!
  const { points, satellite, wasSampled } = filterReadings(query, readings)
  const samplingNotice = wasSampled
    ? ` Se muestran ${MAX_CHART_POINTS} observaciones distribuidas uniformemente en el intervalo; no se interpolaron valores.`
    : ''

  return {
    query,
    instrument: { code: selection.instrument.code, name: selection.instrument.name },
    product: { code: selection.product.code, name: selection.product.name },
    parameter,
    origin: {
      kind: 'observed',
      provider: 'NOAA Space Weather Prediction Center',
      notice: `Datos observados del servicio público GOES primario de NOAA. La fuente ofrece una ventana móvil de siete días.${samplingNotice}`,
      ...(satellite ? { satellite } : {}),
    },
    visualization: 'time-series',
    points,
  }
}

async function queryXrays(query: ScientificDataQuery, parameter: ScientificParameter) {
  const readings = await fetchNoaaJson(
    '/json/goes/primary/xrays-7-day.json',
    z.array(xrayReadingSchema),
  )
  return buildTimeSeriesResult(
    query,
    parameter,
    readings
      .filter((reading: XrayReading) => reading.energy === parameter.code)
      .map((reading) => ({
        timestamp: reading.time_tag,
        value: reading.flux !== null && reading.flux >= 0 ? reading.flux : null,
        satellite: reading.satellite,
      })),
  )
}

async function queryEuv(query: ScientificDataQuery, parameter: ScientificParameter) {
  const readings = await fetchNoaaJson(
    '/json/goes/primary/euvs-7-day.json',
    z.array(euvReadingSchema),
  )
  return buildTimeSeriesResult(
    query,
    parameter,
    readings
      .filter((reading: EuvReading) => reading.line === parameter.code)
      .map((reading) => ({
        timestamp: reading.time_tag,
        value: reading.value !== null && reading.value >= 0 ? reading.value : null,
        satellite: reading.satellite,
      })),
  )
}

async function queryMagnetometer(query: ScientificDataQuery, parameter: ScientificParameter) {
  const readings = await fetchNoaaJson(
    '/json/goes/primary/magnetometers-7-day.json',
    z.array(magnetometerReadingSchema),
  )
  const component = parameter.code as keyof Pick<MagnetometerReading, 'Hp' | 'He' | 'Hn' | 'total'>

  return buildTimeSeriesResult(
    query,
    parameter,
    readings.map((reading) => ({
      timestamp: reading.time_tag,
      value: reading[component],
      satellite: reading.satellite,
    })),
  )
}

async function queryMpsh(query: ScientificDataQuery, parameter: ScientificParameter) {
  const selector = parameter.code.split(':')[1]
  const readings = await fetchNoaaJson(
    '/json/goes/primary/differential-electrons-7-day.json',
    z.array(particleReadingSchema),
  )

  return buildTimeSeriesResult(
    query,
    parameter,
    readings
      .filter((reading: ParticleReading) => reading.energy === selector)
      .map((reading) => ({
        timestamp: reading.time_tag,
        value: reading.flux !== null && reading.flux >= 0 ? reading.flux : null,
        satellite: reading.satellite,
      })),
  )
}

async function querySgps(query: ScientificDataQuery, parameter: ScientificParameter) {
  const differential = parameter.code.startsWith('proton:')
  const readings = await fetchNoaaJson(
    differential
      ? '/json/goes/primary/differential-protons-7-day.json'
      : '/json/goes/primary/integral-protons-7-day.json',
    z.array(particleReadingSchema),
  )

  return buildTimeSeriesResult(
    query,
    parameter,
    readings
      .filter((reading: ParticleReading) =>
        differential
          ? reading.channel === parameter.code.split(':')[1]
          : reading.energy === parameter.code,
      )
      .map((reading) => ({
        timestamp: reading.time_tag,
        value: reading.flux !== null && reading.flux >= 0 ? reading.flux : null,
        satellite: reading.satellite,
      })),
  )
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
    z.array(suviImageSchema),
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
  if (!selection || query.source !== 'GOES') {
    throw new Error('The NOAA source only accepts GOES products')
  }

  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === query.parameter,
  )!

  switch (query.product) {
    case 'SFXR':
      return queryXrays(query, parameter)
    case 'SFEU':
      return queryEuv(query, parameter)
    case 'GEOF':
      return queryMagnetometer(query, parameter)
    case 'MPSH':
      return queryMpsh(query, parameter)
    case 'SGPS':
      return querySgps(query, parameter)
    case 'Fe093':
    case 'Fe131':
    case 'Fe171':
    case 'Fe195':
    case 'Fe284':
    case 'He303':
      return querySuvi(query, parameter)
    default:
      throw new Error(`GOES product ${query.product} has no configured public source`)
  }
}
