import { z } from 'zod'

import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'

/**
 * The client-safe half of the publications module: types, the Zod contracts of the
 * `/api/publicaciones` endpoints and the bilingual review rule. It imports nothing from the
 * server, so the editor validates with exactly the rules the API enforces. Data access lives in
 * `publications.ts`, which re-exports everything here.
 */

export type ResearchGroup = 'LASCE' | 'ROSAC'

/** The fields of a publication that are written once per language. */
export const translatableFields = ['title', 'abstract'] as const

export type TranslatableField = (typeof translatableFields)[number]

export type LocalizedPublicationContent = Record<TranslatableField, string>

/** Every locale except the source one: the locales stored in `research_record_translations`. */
export type TranslationLocale = Exclude<Locale, typeof defaultLocale>

export const translationLocales = locales.filter(
  (locale): locale is TranslationLocale => locale !== defaultLocale,
)

/**
 * A publication's translatable text in every language, as stored. The source language lives on
 * the base row and is always present; another language is `null` when the record has no
 * translation row for it yet.
 */
export type StoredPublicationContent = {
  [L in Locale]: L extends typeof defaultLocale
    ? LocalizedPublicationContent
    : LocalizedPublicationContent | null
}

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

/** Each language's name as it appears in validation messages. */
const languageNames: Record<Locale, string> = { es: 'en español', en: 'en inglés' }

function localizedContentSchema(locale: Locale) {
  const language = languageNames[locale]

  return z.strictObject(
    {
      title: z
        .string({ error: `El título ${language} es obligatorio y debe ser texto.` })
        .trim()
        .min(1, `El título ${language} es obligatorio.`),
      abstract: z
        .string({ error: `El resumen ${language} es obligatorio y debe ser texto.` })
        .trim()
        .min(1, `El resumen ${language} es obligatorio.`),
    },
    { error: `Falta el contenido ${language} (title y abstract).` },
  )
}

// `satisfies` makes adding a locale to `locales` a type error here until its content is required.
export const contentSchema = z.strictObject(
  {
    es: localizedContentSchema('es'),
    en: localizedContentSchema('en'),
  } satisfies Record<Locale, ReturnType<typeof localizedContentSchema>>,
  { error: 'El contenido (content) debe incluir los idiomas es y en.' },
)

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
const reviewConfirmationSchema = z.strictObject({
  locale: z.enum(locales),
  field: z.enum(translatableFields),
})

export type ReviewConfirmation = z.infer<typeof reviewConfirmationSchema>

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
    version: z.iso.datetime({
      offset: true,
      error: 'La versión de la publicación es obligatoria y debe ser la que se cargó.',
    }),
    content: contentSchema.optional(),
    confirmedUnchanged: z
      .array(reviewConfirmationSchema)
      .max(locales.length * translatableFields.length)
      .optional(),
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
export type PublicationContentInput = PublicationCreateInput['content']

/**
 * The translatable fields that changed in some languages but not in others, minus the ones the
 * editor confirmed as still correct in this operation. A language with no stored text yet (a
 * legacy record) counts as changed, so completing a legacy record's English requires reviewing
 * its base text too: that text may not be Spanish at all.
 */
export function findPendingReviews(
  current: StoredPublicationContent,
  next: PublicationContentInput,
  confirmed: ReviewConfirmation[],
): ReviewConfirmation[] {
  const pending: ReviewConfirmation[] = []

  for (const field of translatableFields) {
    const changed = locales.filter(
      (locale) => current[locale]?.[field].trim() !== next[locale][field].trim(),
    )

    if (changed.length === 0 || changed.length === locales.length) continue

    for (const locale of locales) {
      if (changed.includes(locale)) continue

      const isConfirmed = confirmed.some(
        (confirmation) => confirmation.locale === locale && confirmation.field === field,
      )

      if (!isConfirmed) pending.push({ locale, field })
    }
  }

  return pending
}
