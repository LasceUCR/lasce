import { createGoesReadings } from './goesReadingsDataSource'

/**
 * SEISS magnetospheric electron and proton (MPSH) series from the readings the worker's
 * `seiss-pipeline` stores in InfluxDB (`mpsh_flux`): NOAA's L2 1-minute averages for five
 * telescopes, ten electron and eleven proton bands each. Only ingested days have data; any other
 * day is an empty series. See docs/seiss-pipeline.md.
 */
const mpshReadings = createGoesReadings({
  measurement: 'mpsh_flux',
  products: ['MPSH'],
  unsupportedMessage: 'The MPSH readings only accept MPSH',
  dataset: 'mpsh',
})

export const queryMpshReadings = mpshReadings.query

/** Every stored MPSH reading in the window, for the CSV export; never the chart. */
export const queryMpshReadingsFull = mpshReadings.queryFull
