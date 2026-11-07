import { createGoesReadings } from './goesReadingsDataSource'

/**
 * MAG geomagnetic field (GEOF) series from the readings the worker's `mag-pipeline` stores in
 * InfluxDB (`mag_field`): NOAA's L2 1-minute averages, EPN x/y/z and total, in nT. Only ingested
 * days have data; any other day is an empty series. See docs/mag-pipeline.md.
 */
const magReadings = createGoesReadings({
  measurement: 'mag_field',
  products: ['GEOF'],
  unsupportedMessage: 'The MAG readings only accept GEOF',
  dataset: 'mag',
})

export const queryMagReadings = magReadings.query

/** Every stored MAG reading in the window, for the CSV export; never the chart. */
export const queryMagReadingsFull = magReadings.queryFull
