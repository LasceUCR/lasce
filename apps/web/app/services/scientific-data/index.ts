import { queryCiticScientificData } from './citicScientificDataSource'
import { queryEhisReadings } from './ehisReadingsDataSource'
import { queryExisReadings } from './exisReadingsDataSource'
import { queryMagReadings } from './magReadingsDataSource'
import { queryMpshReadings } from './mpshReadingsDataSource'
import { createInstrumentRoutedDataSource } from './instrumentRoutedDataSource'
import { queryMockScientificData } from './mockScientificDataSource'
import type { ScientificDataProvider } from './scientificDataSource'
import { ScientificDataSourceManager } from './scientificDataSourceManager'
import { querySgpsReadings } from './sgpsReadingsDataSource'
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

const sgpsReadings: ScientificDataProvider = {
  query: ({ query }) => querySgpsReadings(query),
}

const mpshReadings: ScientificDataProvider = {
  query: ({ query }) => queryMpshReadings(query),
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
    // Every available SEISS product is ingested daily by the worker's seiss-pipeline. The CITIC
    // instrument provider is no longer reached from /datos (MPSL is not offered); retiring it and
    // the `query-goes-archive` job is a follow-up.
    { EHIS: ehisReadings, SGPS: sgpsReadings, MPSH: mpshReadings },
  ),
  createInstrumentRoutedDataSource('ROSAC', {
    'ROSAC-I1': rosacSimulation,
    'ROSAC-I2': rosacSimulation,
  }),
])
