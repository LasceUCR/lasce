import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type LocalizedContent,
  type ReviewConfirmation as ContentReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'
import { findPendingReviews as findContentReviews } from '@/app/lib/i18n/content/review'

export { translationLocales, type TranslationLocale } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the publications module: types, the Zod contracts of the
 * `/api/publicaciones` endpoints and the bilingual review rule. It imports nothing from the
 * server, so the editor validates with exactly the rules the API enforces. Data access lives in
 * `publications.ts`, which re-exports everything here.
 *
 * The bilingual parts (content schema, stored content, review rule) come from the shared content
 * core in `app/lib/i18n/content/`, configured by `publicationContent`. The names exported here
 * are kept so the API, the editor and their tests do not depend on that core directly.
 */

export type ResearchGroup = 'LASCE' | 'ROSAC'

/**
 * A publication's text, written once per language: both fields are required in every locale.
 * Spanish lives on `research.research_records`; every other locale in
 * `research.research_record_translations`.
 */
export const publicationContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, required: true },
  abstract: { noun: { word: 'resumen', gender: 'm' }, required: true },
})

type PublicationContentSpecs = typeof publicationContent.specs

/** The fields of a publication that are written once per language. */
export const translatableFields = publicationContent.fields

export type TranslatableField = FieldOf<PublicationContentSpecs>

export type LocalizedPublicationContent = LocalizedContent<PublicationContentSpecs>

/**
 * A publication's translatable text in every language, as stored. The source language lives on
 * the base row and is always present; another language is `null` when the record has no
 * translation row for it yet.
 */
export type StoredPublicationContent = StoredContent<PublicationContentSpecs>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type PublicationEditingData = {
  content: StoredPublicationContent
  /**
   * True when the record predates translations and lacks a translation row. Its base text is in
   * whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export type Publication = {
  slug: string
  title: string
  authors: string[]
  venue: string
  year: string
  date: Date
  abstract: string
  href?: string
  DOI?: string
  researchGroup: ResearchGroup
  /**
   * The language `title` and `abstract` are actually in. `null` when the record is legacy and its
   * base text is shown, because that text's language is unknown. Set by `getPublications`.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: PublicationEditingData
}

/**
 * Both languages' title and abstract, trimmed; blank text is rejected. Every supported locale is
 * required, so adding one to `locales` makes its content required too.
 */
export const contentSchema = publicationContent.schema

/**
 * The general DOI structure, `10.<registrant>/<suffix>`: a numeric registrant that may have
 * dot-separated subdivisions, and any suffix without whitespace. Deliberately looser than
 * Crossref's recommended pattern, which rejects some DOIs that do resolve.
 */
const DOI_PATTERN = /^10\.\d+(?:\.\d+)*\/\S+$/

/**
 * An optional text field: absent, `null`, empty or whitespace-only all mean "no value" and
 * become `null`; anything else is trimmed and must match `format`.
 */
function optionalText(format: z.ZodType<string, string>) {
  return z
    .union([z.null(), z.string({ error: 'Debe ser texto o null.' })])
    .transform((value) => value?.trim() || null)
    .pipe(z.union([z.null(), format]))
}

export const externalUrlSchema = optionalText(
  z.url({
    protocol: /^https?$/,
    error: 'El enlace externo debe ser una URL absoluta que empiece con http:// o https://.',
  }),
)

export const doiSchema = optionalText(
  z
    .string()
    .regex(DOI_PATTERN, 'El DOI debe tener la forma 10.<registrante>/<sufijo>, sin prefijos.'),
)

const DATE_REQUIRED = 'La fecha de publicación es obligatoria.'

/**
 * The publication date: a date string (`2026-01-31` or a full ISO timestamp) or a `Date`.
 * Required and never cleared. Only text or a `Date` reaches the coercion, because coercing
 * `null`, `0` or `false` would silently produce 1970-01-01, and blank text is rejected as
 * missing rather than parsed.
 */
export const publicationDateSchema = z
  .union([z.string().trim().min(1, DATE_REQUIRED), z.date()], { error: DATE_REQUIRED })
  .pipe(z.coerce.date({ error: 'La fecha de publicación no es válida.' }))

export const sharedFieldSchemas = {
  authors: z
    .array(
      z
        .string({ error: 'El nombre del autor debe ser texto.' })
        .trim()
        .min(1, 'El nombre del autor es obligatorio.'),
      { error: 'Los autores son obligatorios y deben ser una lista.' },
    )
    .min(1, 'Debe existir al menos un autor.'),
  researchGroup: z.enum(['LASCE', 'ROSAC'], {
    error: 'Seleccione un grupo de investigación válido.',
  }),
  venue: z
    .string({ error: 'La publicación es obligatoria.' })
    .trim()
    .min(1, 'La publicación es obligatoria.'),
  date: publicationDateSchema,
}

/** A field whose text in one language is kept as is while its counterpart changed. */
export type ReviewConfirmation = ContentReviewConfirmation<TranslatableField>

/**
 * Body of a create request. Both languages are required. `href` (external link) and `DOI` are
 * optional: absent, `null` and empty all store `null`.
 */
export const publicationCreateSchema = z.strictObject({
  content: contentSchema,
  ...sharedFieldSchemas,
  href: externalUrlSchema.optional().transform((value) => value ?? null),
  DOI: doiSchema.optional().transform((value) => value ?? null),
})

/**
 * Body of an update request. Every field is optional and only the fields present are written;
 * for `href` and `DOI`, `null` or empty clears the value while leaving the key out keeps it.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a bilingual content update, which needs both languages in full;
 *   absent for an update of shared fields only, which never touches titles or abstracts and
 *   never asks for a missing translation.
 * - `confirmedUnchanged`: only with `content`. For a translatable field changed in one language
 *   only, the other language's text must either change too or be listed here, meaning the editor
 *   reviewed it in this operation and it is still correct. Confirmations are never stored.
 */
export const publicationUpdateSchema = z
  .strictObject({
    version: versionSchema(
      'La versión de la publicación es obligatoria y debe ser la que se cargó.',
    ),
    content: contentSchema.optional(),
    confirmedUnchanged: publicationContent.confirmationsSchema.optional(),
    authors: sharedFieldSchemas.authors.optional(),
    researchGroup: sharedFieldSchemas.researchGroup.optional(),
    venue: sharedFieldSchemas.venue.optional(),
    date: sharedFieldSchemas.date.optional(),
    href: externalUrlSchema.optional(),
    DOI: doiSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }

    const { version: _version, confirmedUnchanged: _confirmed, ...changes } = input
    if (Object.values(changes).every((value) => value === undefined)) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type PublicationCreateInput = z.infer<typeof publicationCreateSchema>
export type PublicationUpdateInput = z.infer<typeof publicationUpdateSchema>
export type PublicationContentInput = ContentInput<PublicationContentSpecs>

/**
 * The translatable fields that changed in some languages but not in others, minus the ones the
 * editor confirmed as still correct in this operation. A language with no stored text yet (a
 * legacy record) counts as changed, so completing a legacy record's English requires reviewing
 * its base text too: that text may not be Spanish at all. The rule itself is the shared one
 * (`app/lib/i18n/content/review.ts`); this binds it to the publication's fields.
 */
export function findPendingReviews(
  current: StoredPublicationContent,
  next: PublicationContentInput,
  confirmed: ReviewConfirmation[],
): ReviewConfirmation[] {
  return findContentReviews(publicationContent, current, next, confirmed)
}
