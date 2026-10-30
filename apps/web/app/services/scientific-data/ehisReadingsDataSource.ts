import { createGoesReadings } from './goesReadingsDataSource'

/**
 * SEISS energetic heavy ion (EHIS) series from the readings the worker's `seiss-pipeline`
 * stores in InfluxDB (`ehis_flux`): NOAA's L1b 5-minute differential fluxes for the H, He, CNO, Ne-S and
 * Cl-Ni mass groups, five energy bands each. Only ingested days have data; any other day is an
 * empty series. See docs/seiss-pipeline.md.
 */
const ehisReadings = createGoesReadings({
  measurement: 'ehis_flux',
  products: ['EHIS'],
  unsupportedMessage: 'The EHIS readings only accept EHIS',
  dataset: 'ehis',
})

export const queryEhisReadings = ehisReadings.query

/** Every stored EHIS reading in the window, for the CSV export; never the chart. */
export const queryEhisReadingsFull = ehisReadings.queryFull
