import { createGoesReadings } from './goesReadingsDataSource'

/**
 * EXIS (SFEU, SFXR) series from the readings the worker's `exis-pipeline` stores in InfluxDB
 * (`exis_irradiance`). Only ingested days have data; any other day is an empty series.
 */
const exisReadings = createGoesReadings({
  measurement: 'exis_irradiance',
  products: ['SFEU', 'SFXR'],
  unsupportedMessage: 'The EXIS readings only accept SFEU and SFXR',
  dataset: 'exis',
})

export const queryExisReadings = exisReadings.query

/** Every stored EXIS reading in the window, for the CSV export; never the chart. */
export const queryExisReadingsFull = exisReadings.queryFull
