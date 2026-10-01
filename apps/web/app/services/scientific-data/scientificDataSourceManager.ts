import type { ScientificSourceCode } from '@/app/lib/scientific-data'

import { UnsupportedScientificQueryError } from './errors'
import type {
  ScientificDataRequest,
  ScientificDataResponse,
  ScientificDataSource,
} from './scientificDataSource'

/** Holds the registered sources and hands each query to the one named by `query.source`. */
export class ScientificDataSourceManager {
  private readonly sources = new Map<ScientificSourceCode, ScientificDataSource>()

  constructor(sources: ScientificDataSource[]) {
    for (const source of sources) {
      if (this.sources.has(source.code)) {
        throw new Error(`Scientific data source ${source.code} is registered twice`)
      }
      this.sources.set(source.code, source)
    }
  }

  query(request: ScientificDataRequest): Promise<ScientificDataResponse> {
    const source = this.sources.get(request.query.source)
    if (!source) {
      return Promise.reject(
        new UnsupportedScientificQueryError(
          `No scientific data source is registered for ${request.query.source}`,
        ),
      )
    }

    return source.query(request)
  }
}
