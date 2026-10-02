import { queryCiticScientificData } from './citicScientificDataSource'
import { queryExisReadings } from './exisReadingsDataSource'
import { createInstrumentRoutedDataSource } from './instrumentRoutedDataSource'
import { queryMockScientificData } from './mockScientificDataSource'
import type { ScientificDataProvider } from './scientificDataSource'
import { ScientificDataSourceManager } from './scientificDataSourceManager'
import { querySuviFrames } from './suviFrameDataSource'

/*
 * The one place that decides which backend serves which product. To replace a backend (for
 * example the CITIC worker with a database reader), implement `ScientificDataProvider` and swap
 * the entry below; the route and the other sources are unaffected.
 */

const suviArchive: ScientificDataProvider = {
  query: ({ query }) => querySuviFrames(query),
}

const exisReadings: ScientificDataProvider = {
  query: ({ query }) => queryExisReadings(query),
}

const citicArchive: ScientificDataProvider = {
  query: ({ query, jobId }) => queryCiticScientificData(query, jobId),
}

const rosacSimulation: ScientificDataProvider = {
  query: ({ query }) => queryMockScientificData(query),
}

export const scientificDataSources = new ScientificDataSourceManager([
  createInstrumentRoutedDataSource('GOES', {
    SUVI: suviArchive,
    EXIS: exisReadings,
    MAG: citicArchive,
    SEISS: citicArchive,
  }),
  createInstrumentRoutedDataSource('ROSAC', {
    'ROSAC-I1': rosacSimulation,
    'ROSAC-I2': rosacSimulation,
  }),
])
