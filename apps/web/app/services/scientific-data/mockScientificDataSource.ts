import {
  findScientificProduct,
  type DynamicSpectrumCell,
  type DynamicSpectrumDataResult,
  type ScientificDataPoint,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'
import { getQueryMinuteRange } from '@/app/lib/scientific-data-time'

const SERIES_INTERVAL_MINUTES = 15
const SPECTRUM_INTERVAL_MINUTES = 10
const SPECTRUM_FREQUENCIES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

const MINUTES_PER_DAY = 24 * 60

function formatTime(minutesSinceMidnight: number) {
  const minutes = minutesSinceMidnight % MINUTES_PER_DAY
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function nextDay(date: string) {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + 1)
  return result.toISOString().slice(0, 10)
}

/** A range that crosses midnight continues on the next UTC day. */
function createTimestamps(query: ScientificDataQuery, intervalMinutes: number) {
  const timestamps: string[] = []
  const { start, end } = getQueryMinuteRange(query)

  for (let minute = start; minute <= end; minute += intervalMinutes) {
    const date = minute >= MINUTES_PER_DAY ? nextDay(query.date) : query.date
    timestamps.push(`${date}T${formatTime(minute)}:00Z`)
  }

  return timestamps
}

function resultBase(query: ScientificDataQuery) {
  const selection = findScientificProduct(query.source, query.product)!
  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === query.parameter,
  )!

  return {
    query,
    instrument: { code: selection.instrument.code, name: selection.instrument.name },
    product: { code: selection.product.code, name: selection.product.name },
    parameter,
    origin: {
      kind: 'simulated' as const,
      dataset: 'rosac' as const,
      resolution: 'sampled' as const,
    },
  }
}

function querySimulatedTimeSeries(query: ScientificDataQuery): TimeSeriesDataResult {
  const points: ScientificDataPoint[] = createTimestamps(query, SERIES_INTERVAL_MINUTES).map(
    (timestamp, index) => ({
      timestamp,
      value: Number((52 + Math.sin(index * 0.68) * 17 + Math.cos(index * 0.21) * 7).toFixed(3)),
    }),
  )

  return { ...resultBase(query), visualization: 'time-series', points }
}

function querySimulatedDynamicSpectrum(query: ScientificDataQuery): DynamicSpectrumDataResult {
  const timestamps = createTimestamps(query, SPECTRUM_INTERVAL_MINUTES)
  const cells: DynamicSpectrumCell[] = timestamps.flatMap((timestamp, timeIndex) =>
    SPECTRUM_FREQUENCIES.map((frequency, frequencyIndex) => {
      const driftingBurst = Math.exp(-Math.pow((frequencyIndex - (8 - timeIndex * 0.18)) / 1.35, 2))
      const background = 18 + 5 * Math.sin(timeIndex * 0.35 + frequencyIndex * 0.7)

      return {
        timestamp,
        frequency,
        value: Number((background + driftingBurst * 76).toFixed(3)),
      }
    }),
  )

  return {
    ...resultBase(query),
    visualization: 'dynamic-spectrum',
    frequencyUnit: 'MHz',
    cells,
    timestamps,
    frequencies: SPECTRUM_FREQUENCIES,
  }
}

/**
 * Temporary ROSAC adapter. It never fabricates GOES observations: simulation
 * is restricted to the explicitly provisional ROSAC source.
 */
export async function queryMockScientificData(query: ScientificDataQuery) {
  if (query.source !== 'ROSAC') {
    throw new Error('The mock source only accepts provisional ROSAC products')
  }

  return query.product === 'ROSAC-I2'
    ? querySimulatedDynamicSpectrum(query)
    : querySimulatedTimeSeries(query)
}
