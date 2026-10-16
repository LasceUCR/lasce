import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type FieldOf,
  type LocalizedContent,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the research areas module: what is translatable and the shape the
 * pages and their components share. It imports nothing from the server. Data access lives in
 * `research-areas.ts`.
 *
 * A research area's title and description are written once per language, both required (see
 * docs/translate-database-content.md). Spanish lives on `areas.research_areas`; every other
 * locale in `areas.research_area_translations`. The photograph (`src`) is shared.
 */
export const researchAreaContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

type ResearchAreaContentSpecs = typeof researchAreaContent.specs

export type ResearchAreaField = FieldOf<ResearchAreaContentSpecs>

export type LocalizedResearchAreaContent = LocalizedContent<ResearchAreaContentSpecs>

/**
 * A research area's translatable text in every language, as stored. Spanish lives on the base
 * row and is always present; another language is `null` while the area has no translation row
 * for it yet.
 */
export type StoredResearchAreaContent = StoredContent<ResearchAreaContentSpecs>

export interface ResearchArea {
  id: string
  title: string
  description: string
  src?: string
  /**
   * The language `title` and `description` are actually in: the requested one when the area has
   * it, Spanish for a complete area otherwise, and `null` for an area saved before translations
   * existed, whose base text's language is unknown. Absent when not resolved by the service.
   */
  contentLocale?: Locale | null
}
