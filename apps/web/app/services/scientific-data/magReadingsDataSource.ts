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
  provider: 'CITIC-UCR — campo geomagnético MAG nivel 2 de NOAA (promedios de 1 minuto)',
  notice:
    'Promedios de 1 minuto del magnetómetro (nivel 2) ingeridos diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno y observaciones marcadas con calidad degradada o inválida.',
  fullNotice:
    'Promedios de 1 minuto del magnetómetro (nivel 2) ingeridos diariamente por CITIC-UCR, sin muestreo: incluye todas las observaciones válidas del intervalo.',
})

export const queryMagReadings = magReadings.query

/** Every stored MAG reading in the window, for the CSV export; never the chart. */
export const queryMagReadingsFull = magReadings.queryFull
