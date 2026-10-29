import {
  findScientificProduct,
  type ScientificInstrumentCode,
  type ScientificProductCode,
  type ScientificSourceCode,
} from '@/app/lib/scientific-data'

import { UnsupportedScientificQueryError } from './errors'
import type { ScientificDataProvider, ScientificDataSource } from './scientificDataSource'

/**
 * A source whose products are served by different backends, chosen by the instrument that
 * owns the product in the catalog (for GOES: SUVI from the frame archive, EXIS and MAG from InfluxDB, SEISS from CITIC).
 * `productProviders` overrides that choice for single products, for an instrument whose products
 * are not all served the same way (SEISS EHIS from InfluxDB while MPSH and SGPS stay on CITIC).
 */
export function createInstrumentRoutedDataSource(
  code: ScientificSourceCode,
  providers: Partial<Record<ScientificInstrumentCode, ScientificDataProvider>>,
  productProviders: Partial<Record<ScientificProductCode, ScientificDataProvider>> = {},
): ScientificDataSource {
  return {
    code,
    query(request) {
      const selection = findScientificProduct(code, request.query.product)
      const provider =
        selection &&
        (productProviders[selection.product.code] ?? providers[selection.instrument.code])
      if (!provider) {
        return Promise.reject(
          new UnsupportedScientificQueryError(
            `No provider is registered for ${code} product ${request.query.product}`,
          ),
        )
      }

      return provider.query(request)
    },
  }
}
