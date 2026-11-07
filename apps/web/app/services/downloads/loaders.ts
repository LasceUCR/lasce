import type { DownloadFormat } from '@/app/lib/downloads/formats'
import type {
  ScientificDataQuery,
  ScientificInstrumentCode,
  ScientificProductCode,
  ScientificSourceCode,
} from '@/app/lib/scientific-data'
import { scientificDataSources } from '@/app/services/scientific-data'
import { queryEhisReadingsFull } from '@/app/services/scientific-data/ehisReadingsDataSource'
import { UnsupportedScientificQueryError } from '@/app/services/scientific-data/errors'
import { queryExisReadingsFull } from '@/app/services/scientific-data/exisReadingsDataSource'
import { queryMagReadingsFull } from '@/app/services/scientific-data/magReadingsDataSource'
import { queryMpshReadingsFull } from '@/app/services/scientific-data/mpshReadingsDataSource'
import { querySgpsReadingsFull } from '@/app/services/scientific-data/sgpsReadingsDataSource'
import type {
  ScientificDataRequest,
  ScientificDataResponse,
} from '@/app/services/scientific-data/scientificDataSource'

/** Reads the data a download is made from. May answer `pending` when the backend is asynchronous. */
export type DownloadLoader = (request: ScientificDataRequest) => Promise<ScientificDataResponse>

/** What the user saw on the page: the same (possibly sampled) result the chart was drawn from. */
const chartData: DownloadLoader = (request) => scientificDataSources.query(request)

/** Every EXIS reading in the window, not the 360 the chart samples. */
const exisFullResolution: DownloadLoader = ({ query }) => queryExisReadingsFull(query)

/** Every stored MAG 1-minute reading in the window, not the 360 the chart samples. */
const magFullResolution: DownloadLoader = ({ query }) => queryMagReadingsFull(query)

/** The full-resolution reader of each SEISS product the worker's `seiss-pipeline` ingests. */
const SEISS_FULL_RESOLUTION: Partial<
  Record<ScientificProductCode, (query: ScientificDataQuery) => Promise<ScientificDataResponse>>
> = {
  EHIS: queryEhisReadingsFull,
  SGPS: querySgpsReadingsFull,
  MPSH: queryMpshReadingsFull,
}

/** Every stored reading of the SEISS product in the window, from that product's measurement. */
const seissFullResolution: DownloadLoader = ({ query }) => {
  const read = SEISS_FULL_RESOLUTION[query.product]
  return read
    ? read(query)
    : Promise.reject(
        new UnsupportedScientificQueryError(`SEISS ${query.product} has no data export`),
      )
}

/**
 * Where each downloadable (source, instrument, format) reads its data. Must cover every entry in
 * `DOWNLOAD_POLICIES` (`app/lib/downloads/policy.ts`); `loaders.test.ts` checks that it does.
 */
export const DOWNLOAD_LOADERS: Partial<
  Record<
    ScientificSourceCode,
    Partial<Record<ScientificInstrumentCode, Partial<Record<DownloadFormat, DownloadLoader>>>>
  >
> = {
  GOES: {
    EXIS: { png: chartData, csv: exisFullResolution },
    MAG: { png: chartData, csv: magFullResolution },
    SEISS: { png: chartData, csv: seissFullResolution },
  },
  ROSAC: {
    'ROSAC-I1': { png: chartData, csv: chartData },
    'ROSAC-I2': { png: chartData, csv: chartData },
  },
}

export function findDownloadLoader(
  source: ScientificSourceCode,
  instrument: ScientificInstrumentCode,
  format: DownloadFormat,
): DownloadLoader | null {
  return DOWNLOAD_LOADERS[source]?.[instrument]?.[format] ?? null
}
