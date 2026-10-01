import { queryCiticScientificData } from './citicScientificDataSource'
import { createInstrumentRoutedDataSource } from './instrumentRoutedDataSource'
import { queryMockScientificData } from './mockScientificDataSource'
import { queryNoaaScientificData } from './noaaScientificDataSource'
import type { ScientificDataProvider } from './scientificDataSource'
import { ScientificDataSourceManager } from './scientificDataSourceManager'

/*
 * The one place that decides which backend serves which product. To replace a backend (for
 * example the CITIC worker with a database reader), implement `ScientificDataProvider` and swap
 * the entry below; the route and the other sources are unaffected.
 */

const noaaSuvi: ScientificDataProvider = {
  query: ({ query }) => queryNoaaScientificData(query),
}

const citicArchive: ScientificDataProvider = {
  query: ({ query, jobId }) => queryCiticScientificData(query, jobId),
}

const rosacSimulation: ScientificDataProvider = {
  query: ({ query }) => queryMockScientificData(query),
}

export const scientificDataSources = new ScientificDataSourceManager([
  createInstrumentRoutedDataSource('GOES', {
    SUVI: noaaSuvi,
    EXIS: citicArchive,
    MAG: citicArchive,
    SEISS: citicArchive,
  }),
  createInstrumentRoutedDataSource('ROSAC', {
    'ROSAC-I1': rosacSimulation,
    'ROSAC-I2': rosacSimulation,
  }),
])
