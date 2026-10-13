import type { DownloadFormat } from '@/app/lib/downloads/formats'
import type { ScientificInstrumentCode, ScientificSourceCode } from '@/app/lib/scientific-data'
import { scientificDataSources } from '@/app/services/scientific-data'
import { queryExisReadingsFull } from '@/app/services/scientific-data/exisReadingsDataSource'
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

/**
 * Where each downloadable (source, instrument, format) reads its data. Must cover every entry in
 * `DOWNLOAD_POLICIES` (`app/lib/downloads/policy.ts`); `loaders.test.ts` checks that it does.
 *
 * A data export of MAG or SEISS needs a full-resolution path through the worker first, since
 * the `query-goes-archive` job samples to 360 points; add its loader here when it exists.
 */
export const DOWNLOAD_LOADERS: Partial<
  Record<
    ScientificSourceCode,
    Partial<Record<ScientificInstrumentCode, Partial<Record<DownloadFormat, DownloadLoader>>>>
  >
> = {
  GOES: {
    EXIS: { png: chartData, csv: exisFullResolution },
    MAG: { png: chartData },
    SEISS: { png: chartData },
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
