import {
  findScientificProduct,
  type ScientificDataOrigin,
  type ScientificDataResult,
  type ScientificSource,
} from './scientific-data'

/**
 * Describes a query result in the visitor's language. Results travel as codes (see
 * `ScientificDataOrigin`); the page (`ScientificDataExplorer`) and the download files
 * (`services/downloads/exporters/`) turn them into copy with the catalogue they already have.
 * Client-safe: no server imports.
 */

/**
 * A translator scoped to `scientificData.origins` or `scientificData.files`: what `useTranslations`
 * and `getTranslations` return, narrowed to the calls made here so tests can pass a plain function.
 */
export type ScientificCopyTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string

/**
 * `result` with its instrument, product and parameter names taken from `sources`, the catalogue
 * in the visitor's language. Whatever `sources` does not list keeps the name the result carries.
 */
export function localizeResultNames<Result extends ScientificDataResult>(
  result: Result,
  sources: readonly ScientificSource[],
): Result {
  const selection = findScientificProduct(result.query.source, result.query.product, sources)
  if (!selection) return result
  const parameter = selection.product.parameters.find(
    (candidate) => candidate.code === result.parameter.code,
  )

  return {
    ...result,
    instrument: { ...result.instrument, name: selection.instrument.name },
    product: { ...result.product, name: selection.product.name },
    parameter: parameter ? { ...result.parameter, label: parameter.label } : result.parameter,
  }
}

/**
 * The provider and the notice shown with a result. `t` is scoped to `scientificData.origins`. A
 * full-resolution export says it was not sampled; a sampled chart says how many points it shows.
 */
export function describeOrigin(origin: ScientificDataOrigin, t: ScientificCopyTranslator) {
  const notes = [t(`${origin.dataset}.notice`)]
  if (origin.resolution === 'full') notes.push(t('full'))
  else if (origin.sampledPoints) notes.push(t('sampled', { count: origin.sampledPoints }))

  return { provider: t(`${origin.dataset}.provider`), notice: notes.join(' ') }
}
