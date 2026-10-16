import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type LocalizedContent,
  type ReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the research areas module: what is translatable, the shape the pages
 * and their components share, and the Zod contracts of the `/api/research-areas` endpoints. It
 * imports nothing from the server, so the editor validates with exactly the rules the API
 * enforces. Data access lives in `research-areas.ts`.
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

/** A field kept as is in one language while its counterpart changed, confirmed by the editor. */
export type ResearchAreaReviewConfirmation = ReviewConfirmation<ResearchAreaField>

export type ResearchAreaContentInput = ContentInput<ResearchAreaContentSpecs>

/** What an editor needs that a visitor does not: every language and the version to save against. */
export interface ResearchAreaEditingData {
  content: StoredResearchAreaContent
  /** True while the area lacks a translation row: its base text's language is then unknown. */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

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
  /** Present only when loaded for an editor (`includeEditingData`). */
  editing?: ResearchAreaEditingData
}

/**
 * The messages of the shared photograph rule, from `researchAreas.validation` in
 * `apps/web/messages/`. The API uses the Spanish ones; an editor builds the rule with the
 * messages of the site's language.
 */
export type ResearchAreaFieldMessages = typeof es.researchAreas.validation

/** The photograph, shared by every language: the address of an image already uploaded. */
export function researchAreaSrcSchema(messages: ResearchAreaFieldMessages) {
  return z.string({ error: messages.srcNotText }).trim().min(1, messages.srcRequired)
}

const srcSchema = researchAreaSrcSchema(es.researchAreas.validation)

/** Body of `POST /api/research-areas`: the title and description in every language, and the photo. */
export const researchAreaCreateSchema = z.strictObject({
  content: researchAreaContent.schema,
  src: srcSchema,
})

/**
 * Body of `PATCH /api/research-areas/[id]`. Only the fields present are written:
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a content update, which carries every language in full; absent for a
 *   photo-only update, which never touches the translations and never asks for a missing one.
 * - `confirmedUnchanged`: only with `content`. A field changed in one language only must change
 *   in the other too, or be listed here as reviewed and still correct, in this edit.
 */
export const researchAreaUpdateSchema = z
  .strictObject({
    version: versionSchema(
      'La versión del área de investigación es obligatoria y debe ser la que se cargó.',
    ),
    content: researchAreaContent.schema.optional(),
    confirmedUnchanged: researchAreaContent.confirmationsSchema.optional(),
    src: srcSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }

    if (input.content === undefined && input.src === undefined) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type ResearchAreaCreateInput = z.infer<typeof researchAreaCreateSchema>
export type ResearchAreaUpdateInput = z.infer<typeof researchAreaUpdateSchema>
