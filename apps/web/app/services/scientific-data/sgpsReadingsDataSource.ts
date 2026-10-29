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
  provider:
    'CITIC-UCR — protones solares y galácticos SEISS SGPS nivel 2 de NOAA (promedios de 1 minuto)',
  notice:
    'Promedios de 1 minuto del sensor SGPS (nivel 2) ingeridos diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno y promedios sin muestras válidas; se conservan los que incluyen muestras marcadas por los controles de calidad del instrumento.',
  fullNotice:
    'Promedios de 1 minuto del sensor SGPS (nivel 2) ingeridos diariamente por CITIC-UCR, sin muestreo: incluye todas las observaciones válidas del intervalo.',
})

export const querySgpsReadings = sgpsReadings.query
