import { scientificSources, type ScientificSource } from './scientific-data'

/**
 * The stat cards of the administration summary: how much content the CMS manages, plus how many
 * instruments `/datos` can query. Each card links to the page where that content is shown and,
 * in "Modo edición", added. Client-safe; the counts are read by `content-summary.ts`.
 */

export const SUMMARY_CARDS = [
  { key: 'publications', href: '/publicaciones' },
  { key: 'news', href: '/noticias' },
  { key: 'researchAreas', href: '/investigacion' },
  { key: 'lasceResearchers', href: '/nosotros' },
  { key: 'rosacResearchers', href: '/radioastronomia' },
  { key: 'instruments', href: '/datos' },
] as const

export type SummaryCardKey = (typeof SUMMARY_CARDS)[number]['key']

export type ContentSummary = Record<SummaryCardKey, number>

/**
 * Instruments a visitor can query in `/datos`: those of an observed source with at least one
 * available product. ROSAC's are left out because its data is simulated until its instruments
 * are defined.
 */
export function countQueryableInstruments(
  sources: readonly ScientificSource[] = scientificSources,
): number {
  return sources
    .filter((source) => source.dataKind === 'observed')
    .flatMap((source) => source.instruments)
    .filter((instrument) => instrument.products.some((product) => product.available)).length
}
