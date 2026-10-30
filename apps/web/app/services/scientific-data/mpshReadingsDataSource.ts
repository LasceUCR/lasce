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
  provider:
    'CITIC-UCR — electrones y protones magnetosféricos SEISS MPS-HI nivel 2 de NOAA (promedios de 1 minuto)',
  notice:
    'Promedios de 1 minuto del sensor MPS-HI (nivel 2) ingeridos diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno y promedios sin muestras válidas; se conservan los que incluyen muestras marcadas por los controles de calidad del instrumento.',
  fullNotice:
    'Promedios de 1 minuto del sensor MPS-HI (nivel 2) ingeridos diariamente por CITIC-UCR, sin muestreo: incluye todas las observaciones válidas del intervalo.',
})

export const queryMpshReadings = mpshReadings.query

/** Every stored MPSH reading in the window, for the CSV export; never the chart. */
export const queryMpshReadingsFull = mpshReadings.queryFull
