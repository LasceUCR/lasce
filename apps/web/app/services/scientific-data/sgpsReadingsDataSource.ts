import { createGoesReadings } from './goesReadingsDataSource'

/**
 * SEISS solar and galactic proton (SGPS) series from the readings the worker's `seiss-pipeline`
 * stores in InfluxDB (`sgps_flux`): NOAA's L2 1-minute averages for the −X and +X sensor units,
 * thirteen differential channels and the > 500 MeV integral one each. Only ingested days have
 * data; any other day is an empty series. See docs/seiss-pipeline.md.
 */
const sgpsReadings = createGoesReadings({
  measurement: 'sgps_flux',
  products: ['SGPS'],
  unsupportedMessage: 'The SGPS readings only accept SGPS',
  dataset: 'sgps',
})

export const querySgpsReadings = sgpsReadings.query

/** Every stored SGPS reading in the window, for the CSV export; never the chart. */
export const querySgpsReadingsFull = sgpsReadings.queryFull
