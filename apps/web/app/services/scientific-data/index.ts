import { queryCiticScientificData } from './citicScientificDataSource'
import { queryEhisReadings } from './ehisReadingsDataSource'
import { queryExisReadings } from './exisReadingsDataSource'
import { queryMagReadings } from './magReadingsDataSource'
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

const magReadings: ScientificDataProvider = {
  query: ({ query }) => queryMagReadings(query),
}

const ehisReadings: ScientificDataProvider = {
  query: ({ query }) => queryEhisReadings(query),
}

const citicArchive: ScientificDataProvider = {
  query: ({ query, jobId }) => queryCiticScientificData(query, jobId),
}

const rosacSimulation: ScientificDataProvider = {
  query: ({ query }) => queryMockScientificData(query),
}

export const scientificDataSources = new ScientificDataSourceManager([
  createInstrumentRoutedDataSource(
    'GOES',
    {
      SUVI: suviArchive,
      EXIS: exisReadings,
      MAG: magReadings,
      SEISS: citicArchive,
    },
    // SEISS EHIS is ingested daily by the worker; the other SEISS products stay on CITIC.
    { EHIS: ehisReadings },
  ),
  createInstrumentRoutedDataSource('ROSAC', {
    'ROSAC-I1': rosacSimulation,
    'ROSAC-I2': rosacSimulation,
  }),
])
