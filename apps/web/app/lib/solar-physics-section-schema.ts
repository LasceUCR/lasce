import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type FieldOf,
  type LocalizedContent,
  type ReviewConfirmation as ContentReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

export { translationLocales } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the solar physics section module: types and the Zod contract of
 * `PATCH /api/solar-physics/lasce-section`. It imports nothing from the server, so the editor
 * validates with exactly the rules the API enforces. Data access lives in
 * `solar-physics-section.ts`, which re-exports everything here.
 */

/** The key of the only section today: "El trabajo de LASCE en Física Solar". */
export const LASCE_SECTION_KEY = 'lasce'

/**
 * The section's text, written once per language: both fields are required in every locale.
 * `body` is plain text, and a blank line separates paragraphs.
 */
export const solarPhysicsSectionContent = defineTranslatableContent({
  title: {
    noun: { word: 'título', gender: 'm' },
    nouns: { en: 'title' },
    required: true,
    maxLength: 160,
  },
  body: {
    noun: { word: 'texto', gender: 'm' },
    nouns: { en: 'text' },
    required: true,
    maxLength: 5000,
  },
})

type SectionContentSpecs = typeof solarPhysicsSectionContent.specs

export type SolarPhysicsSectionField = FieldOf<SectionContentSpecs>

export type LocalizedSolarPhysicsSectionContent = LocalizedContent<SectionContentSpecs>

/** The section's title and body in every language, as stored. */
export type StoredSolarPhysicsSectionContent = StoredContent<SectionContentSpecs>

export type SolarPhysicsSectionReviewConfirmation =
  ContentReviewConfirmation<SolarPhysicsSectionField>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type SolarPhysicsSectionEditingData = {
  content: StoredSolarPhysicsSectionContent
  /**
   * True when the section predates translations and lacks a translation row. Its base text is
   * in whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export type SolarPhysicsSection = {
  title: string
  /** The body split on blank lines, in the language shown. */
  paragraphs: string[]
  /** The language `title` and `paragraphs` are actually in; `null` when it is unknown (legacy). */
  contentLocale: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: SolarPhysicsSectionEditingData
}

/**
 * Body of `PATCH /api/solar-physics/lasce-section`. The section has no shared fields, so the
 * content is required and always sent in every language.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `confirmedUnchanged`: for a field changed in one language only, the other language's text
 *   must either change too or be listed here. Confirmations are never stored.
 */
export const solarPhysicsSectionUpdateSchema = z.strictObject({
  version: versionSchema('La versión de la sección es obligatoria y debe ser la que se cargó.'),
  content: solarPhysicsSectionContent.schema,
  confirmedUnchanged: solarPhysicsSectionContent.confirmationsSchema.optional(),
})

export type SolarPhysicsSectionUpdateInput = z.infer<typeof solarPhysicsSectionUpdateSchema>

/** Splits a body into paragraphs at blank lines; each one is trimmed and empty ones are dropped. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}
