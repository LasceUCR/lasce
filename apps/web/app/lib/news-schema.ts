import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type ReviewConfirmation as ContentReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'
import { findPendingReviews as findContentReviews } from '@/app/lib/i18n/content/review'

export { translationLocales } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the news module: types, the Zod contracts of the `/api/news`
 * endpoints and the bilingual review rule. It imports nothing from the server, so the editor
 * validates with exactly the rules the API enforces. Data access lives in `news.ts`, which
 * re-exports everything here.
 */

/**
 * A news item's text, written once per language: both fields are required in every locale.
 * Spanish lives on `news.news_records`; every other locale in `news.news_record_translations`.
 * The source, authors, date and link are shared by every language.
 */
export const newsContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  abstract: { noun: { word: 'resumen', gender: 'm' }, nouns: { en: 'abstract' }, required: true },
})

type NewsContentSpecs = typeof newsContent.specs

export type NewsField = FieldOf<NewsContentSpecs>

/**
 * A news item's translatable text in every language, as stored. Spanish lives on the base row and
 * is always present; English is `null` while the item has no translation row for it.
 */
export type StoredNewsContent = StoredContent<NewsContentSpecs>

export type NewsContentInput = ContentInput<NewsContentSpecs>

/** A field kept as is in one language while its counterpart changed. */
export type ReviewConfirmation = ContentReviewConfirmation<NewsField>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type NewsEditingData = {
  content: StoredNewsContent
  /**
   * True when the item predates translations and lacks a translation row. Its base text is in
   * whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export type NewsArticle = {
  slug: string
  title: string
  /** The authors in citation order, joined with ", ". */
  authors: string
  source: string
  /** The date as displayed in the visitor's language; `null` for an undated item. */
  date: string | null
  /** Raw ISO date (`yyyy-mm-dd`), or `null` when undated: what `<time>` and the edit form need. */
  publishedAt: string | null
  abstract: string
  href: string
  /**
   * The language `title` and `abstract` are actually in. `null` when the item is legacy and its
   * base text is shown, because that text's language is unknown. Set by `getNews`.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: NewsEditingData
}

/**
 * The messages of the shared fields' rules, from the `news.validation` namespace of
 * `apps/web/messages/`. They are plain text, read with `t.raw` in the editor: no ICU arguments.
 */
export type NewsFieldMessages = typeof es.news.validation

/**
 * The shared fields' rules, with their messages in one language. The API uses the Spanish ones;
 * the editor builds its own in the language the site is shown in, so it applies the same rules
 * and says so in that language.
 */
export function newsFieldSchemas(messages: NewsFieldMessages) {
  return {
    source: z.string({ error: messages.source }).trim().min(1, messages.source),
    authors: z
      .array(z.string({ error: messages.authors }).trim().min(1, messages.authors), {
        error: messages.authors,
      })
      .min(1, messages.authors),
    /** `yyyy-mm-dd`, or `null` for an undated item. */
    publishedAt: z.union([z.null(), z.iso.date({ error: messages.publishedAt })], {
      error: messages.publishedAt,
    }),
    // Only web links: the value becomes an `href` on the public page.
    externalUrl: z
      .string({ error: messages.externalUrl })
      .trim()
      .pipe(z.url({ protocol: /^https?$/, error: messages.externalUrl })),
  }
}

/** The API's rules, in Spanish. */
const sharedFieldSchemas = newsFieldSchemas(es.news.validation)

/** Body of a create request. Both languages are required; an absent date stores `null`. */
export const newsCreateSchema = z.strictObject({
  content: newsContent.schema,
  source: sharedFieldSchemas.source,
  authors: sharedFieldSchemas.authors,
  publishedAt: sharedFieldSchemas.publishedAt.optional().transform((value) => value ?? null),
  externalUrl: sharedFieldSchemas.externalUrl,
})

/**
 * Body of an update request. Every field is optional and only the fields present are written.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a bilingual content update, which needs both languages in full;
 *   absent for an update of shared fields only, which never touches titles or abstracts and
 *   never asks for a missing translation.
 * - `confirmedUnchanged`: only with `content`. For a translatable field changed in one language
 *   only, the other language's text must either change too or be listed here.
 */
export const newsUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión de la noticia es obligatoria y debe ser la que se cargó.'),
    content: newsContent.schema.optional(),
    confirmedUnchanged: newsContent.confirmationsSchema.optional(),
    source: sharedFieldSchemas.source.optional(),
    authors: sharedFieldSchemas.authors.optional(),
    publishedAt: sharedFieldSchemas.publishedAt.optional(),
    externalUrl: sharedFieldSchemas.externalUrl.optional(),
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

export type NewsCreateInput = z.infer<typeof newsCreateSchema>
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>

/**
 * The translatable fields that changed in some languages but not in others, minus the ones the
 * editor confirmed as still correct. A language with no stored text yet (a legacy item) counts as
 * changed, so completing a legacy item's English requires reviewing its base text too.
 */
export function findPendingReviews(
  current: StoredNewsContent,
  next: NewsContentInput,
  confirmed: ReviewConfirmation[],
): ReviewConfirmation[] {
  return findContentReviews(newsContent, current, next, confirmed)
}
