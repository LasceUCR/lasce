import { createGoesReadings } from './goesReadingsDataSource'

/**
 * SEISS energetic heavy ion (EHIS) series from the readings the worker's `ehis-pipeline` stores
 * in InfluxDB (`ehis_flux`): NOAA's L1b 5-minute differential fluxes for the H, He, CNO, Ne-S and
 * Cl-Ni mass groups, five energy bands each. Only ingested days have data; any other day is an
 * empty series. See docs/ehis-pipeline.md.
 */
const ehisReadings = createGoesReadings({
  measurement: 'ehis_flux',
  products: ['EHIS'],
  unsupportedMessage: 'The EHIS readings only accept EHIS',
  provider:
    'CITIC-UCR — iones pesados energéticos SEISS EHIS nivel 1b de NOAA (acumulaciones de 5 minutos)',
  notice:
    'Flujos diferenciales de 5 minutos del sensor EHIS (nivel 1b) ingeridos diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno y observaciones marcadas como inválidas; se conservan las marcadas como degradadas, que en periodos tranquilos son casi todas por el bajo número de conteos.',
  fullNotice:
    'Flujos diferenciales de 5 minutos del sensor EHIS (nivel 1b) ingeridos diariamente por CITIC-UCR, sin muestreo: incluye todas las observaciones válidas del intervalo.',
})

export const queryEhisReadings = ehisReadings.query
