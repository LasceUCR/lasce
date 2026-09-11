import {
  findScientificProduct,
  type DynamicSpectrumCell,
  type DynamicSpectrumDataResult,
  type ScientificDataPoint,
  type ScientificDataQuery,
  type TimeSeriesDataResult,
} from '@/app/lib/scientific-data'

const SERIES_INTERVAL_MINUTES = 15
const SPECTRUM_INTERVAL_MINUTES = 10
const SPECTRUM_FREQUENCIES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours! * 60 + minutes!
}

function formatTime(minutesSinceMidnight: number) {
  const hours = Math.floor(minutesSinceMidnight / 60)
  const minutes = minutesSinceMidnight % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function createTimestamps(query: ScientificDataQuery, intervalMinutes: number) {
  const timestamps: string[] = []
  const start = timeToMinutes(query.startTime)
  const end = timeToMinutes(query.endTime)

  for (let minute = start; minute <= end; minute += intervalMinutes) {
    timestamps.push(`${query.date}T${formatTime(minute)}:00Z`)
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
      provider: 'Prototipo ROSAC — UCR',
      notice:
        'Datos simulados para preparar la integración de ROSAC. Los nombres, canales y valores reales se definirán con el equipo científico.',
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
