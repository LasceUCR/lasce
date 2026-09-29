import { findScientificProduct, type ScientificSourceCode } from '@/app/lib/scientific-data'

import { UnsupportedScientificQueryError } from './errors'
import type { ScientificDataProvider, ScientificDataSource } from './scientificDataSource'

/**
 * A source whose products are served by different backends, chosen by the instrument that
 * owns the product in the catalog (for GOES: SUVI from NOAA, EXIS/MAG/SEISS from CITIC).
 */
export function createInstrumentRoutedDataSource(
  code: ScientificSourceCode,
  providers: Partial<Record<string, ScientificDataProvider>>,
): ScientificDataSource {
  return {
    code,
    query(request) {
      const selection = findScientificProduct(code, request.query.product)
      const provider = selection && providers[selection.instrument.code]
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
