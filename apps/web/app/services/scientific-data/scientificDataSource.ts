import type {
  ScientificDataQuery,
  ScientificDataResult,
  ScientificSourceCode,
} from '@/app/lib/scientific-data'

export interface ScientificDataRequest {
  query: ScientificDataQuery
  /** Poll token returned by an asynchronous backend in a previous pending response. */
  jobId?: string
}

/** Returned by an asynchronous backend while the result is still being produced. */
export interface PendingScientificDataQuery {
  state: 'pending'
  jobId: string
  progress: number
}

export type ScientificDataResponse = ScientificDataResult | PendingScientificDataQuery

/** A backend that serves some products: NOAA SUVI, the CITIC archive, the ROSAC simulation, … */
export interface ScientificDataProvider {
  query(request: ScientificDataRequest): Promise<ScientificDataResponse>
}

/** One source the manager can route to (GOES, ROSAC, …). */
export interface ScientificDataSource extends ScientificDataProvider {
  readonly code: ScientificSourceCode
}
