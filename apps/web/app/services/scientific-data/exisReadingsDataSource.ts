import { createGoesReadings } from './goesReadingsDataSource'

/**
 * EXIS (SFEU, SFXR) series from the readings the worker's `exis-pipeline` stores in InfluxDB
 * (`exis_irradiance`). Only ingested days have data; any other day is an empty series.
 */
const exisReadings = createGoesReadings({
  measurement: 'exis_irradiance',
  products: ['SFEU', 'SFXR'],
  unsupportedMessage: 'The EXIS readings only accept SFEU and SFXR',
  provider: 'CITIC-UCR — lecturas EXIS nivel 1b de NOAA',
  notice:
    'Lecturas EXIS nivel 1b ingeridas diariamente por CITIC-UCR; NOAA publica cada día con aproximadamente un día de retraso. Se excluyen valores de relleno, negativos y observaciones marcadas con calidad degradada o inválida.',
  fullNotice:
    'Lecturas EXIS nivel 1b ingeridas diariamente por CITIC-UCR, sin muestreo: incluye todas las observaciones válidas del intervalo.',
})

export const queryExisReadings = exisReadings.query

/** Every stored EXIS reading in the window, for the CSV export; never the chart. */
export const queryExisReadingsFull = exisReadings.queryFull
