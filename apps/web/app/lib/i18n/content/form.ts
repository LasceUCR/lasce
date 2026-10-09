import { defaultLocale, isLocale, localeLabels, locales, type Locale } from '@/app/lib/i18n/config'

import type {
  ContentInput,
  FieldOf,
  FieldSpecs,
  LocalizedContent,
  ReviewConfirmation,
  TranslatableContent,
} from './definition'
import { editorCopy } from './messages'
import { isLegacyContent } from './resolve'
import { findPendingReviews, sameReview, type StoredValues } from './review'

/**
 * The bilingual half of an editor, without React: drafts of the translatable fields in every
 * locale, change detection, validation with the entity's own content schema, the cross-language
 * review and what the language tabs show. Shared fields (dates, links, relations), their
 * validation and the request bodies stay with each entity, which composes these helpers.
 *
 * Paths follow the API: `content.<locale>.<field>`, so a server error and a client error for the
 * same field land in the same place.
 */

/** What the editor holds while someone types: text as typed, in every locale, never `null`. */
export type ContentDraft<F extends string> = { [L in Locale]: { [K in F]: string } }

/** Messages keyed by field path (`content.en.name`, or an entity's own shared field). */
export type FormErrors = Record<string, string>

type Definition<F extends string> = { readonly fields: readonly F[] }

export function contentPath<F extends string>(locale: Locale, field: F): `content.${Locale}.${F}` {
  return `content.${locale}.${field}`
}

/** True for a path naming one of the definition's fields in a supported locale. */
export function isContentPath(definition: Definition<string>, path: string): boolean {
  const [root, locale, field] = path.split('.')
  return root === 'content' && isLocale(locale) && definition.fields.some((each) => each === field)
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim()
}

/**
 * The `lang` of the field that holds `locale`'s text: the locale itself, except for the base text
 * of a legacy record, whose language is unknown (`''`). That text sits on the default locale's
 * tab but may not be in that language, so it is not announced or spell-checked as if it were.
 * Put it on the input, not on the tab panel: the panel also holds the editor's own labels and
 * messages, which are not in the panel's language.
 */
export function contentFieldLang(
  stored: { readonly [L in Locale]: object | null } | null,
  locale: Locale,
): string {
  return locale === defaultLocale && stored !== null && isLegacyContent(stored) ? '' : locale
}

/** A blank draft: every field empty in every locale. */
export function emptyContentDraft<F extends string>(definition: Definition<F>): ContentDraft<F> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.fromEntries(definition.fields.map((field) => [field, ''])),
    ]),
  ) as ContentDraft<F>
}

/**
 * The draft an existing record opens with. Each locale starts from its own stored text; a locale
 * without stored text starts empty, and an empty optional field starts as `''`. Nothing is ever
 * copied from one locale to another to look like a translation.
 */
export function draftFromStored<F extends string>(
  definition: Definition<F>,
  stored: StoredValues<NoInfer<F>> | null,
): ContentDraft<F> {
  const draft = emptyContentDraft(definition)

  for (const locale of locales) {
    const text = stored?.[locale]
    if (!text) continue
    for (const field of definition.fields) draft[locale][field] = text[field] ?? ''
  }

  return draft
}

/**
 * True when any field differs from what was stored in any locale, ignoring surrounding
 * whitespace. Always true while creating (`stored` is `null`). A locale with no stored text
 * compares as empty, so opening a legacy record and leaving its missing language blank is not a
 * content change: its shared fields can be saved without translating it.
 */
export function hasContentChanges<F extends string>(
  definition: Definition<F>,
  stored: StoredValues<NoInfer<F>> | null,
  draft: ContentDraft<NoInfer<F>>,
): boolean {
  if (!stored) return true

  return locales.some((locale) =>
    definition.fields.some(
      (field) => normalize(stored[locale]?.[field]) !== normalize(draft[locale][field]),
    ),
  )
}

/**
 * The reviews the draft needs, confirmed or not: none while creating or while the content is
 * unchanged, and otherwise the shared review rule (`findPendingReviews`).
 */
export function reviewsNeeded<F extends string>(
  definition: Definition<F>,
  stored: StoredValues<NoInfer<F>> | null,
  draft: ContentDraft<NoInfer<F>>,
): ReviewConfirmation<F>[] {
  if (!stored || !hasContentChanges(definition, stored, draft)) return []
  return findPendingReviews(definition, stored, draft)
}

export function isConfirmed<F extends string>(
  confirmed: readonly ReviewConfirmation<F>[],
  review: ReviewConfirmation<F>,
): boolean {
  return confirmed.some((confirmation) => sameReview(confirmation, review))
}

/** `confirmed` with `review` switched on or off. */
export function withConfirmation<F extends string>(
  confirmed: readonly ReviewConfirmation<F>[],
  review: ReviewConfirmation<F>,
  checked: boolean,
): ReviewConfirmation<F>[] {
  const others = confirmed.filter((each) => !sameReview(each, review))
  return checked ? [...others, review] : others
}

/** Drops every confirmation of `field`: changing it in any locale invalidates them. */
export function resetConfirmations<F extends string>(
  confirmed: readonly ReviewConfirmation<F>[],
  field: F,
): ReviewConfirmation<F>[] {
  return confirmed.filter((confirmation) => confirmation.field !== field)
}

/** The confirmations, in the order given, that the current draft still needs. */
export function confirmationsStillNeeded<F extends string>(
  confirmed: readonly ReviewConfirmation<F>[],
  needed: readonly ReviewConfirmation<F>[],
): ReviewConfirmation<F>[] {
  return confirmed.filter((confirmation) => isConfirmed(needed, confirmation))
}

/**
 * Every problem with the translatable fields, keyed by path. Nothing is checked while the content
 * is unchanged, so a record can be saved for its shared fields alone. Otherwise the draft goes
 * through the entity's own content schema, so the editor shows exactly the API's messages, and
 * every needed review that is not confirmed is flagged on its field.
 */
export function validateContent<S extends FieldSpecs>(
  definition: TranslatableContent<S>,
  stored: StoredValues<FieldOf<S>> | null,
  draft: ContentDraft<FieldOf<S>>,
  confirmed: readonly ReviewConfirmation<FieldOf<S>>[],
): FormErrors {
  const errors: FormErrors = {}
  if (!hasContentChanges(definition, stored, draft)) return errors

  const result = definition.schema.safeParse(draft)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = ['content', ...issue.path.map(String)].join('.')
      errors[path] ??= issue.message
    }
  }

  for (const review of reviewsNeeded(definition, stored, draft)) {
    if (!isConfirmed(confirmed, review)) {
      errors[contentPath(review.locale, review.field)] ??= editorCopy.fieldPending
    }
  }

  return errors
}

/** How many errors each language tab holds. */
export function errorsByLocale(errors: FormErrors): Record<Locale, number> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.keys(errors).filter((path) => path.startsWith(`content.${locale}.`)).length,
    ]),
  ) as Record<Locale, number>
}

/**
 * The tab to open for `errors`: `null` to stay on `current` when it has errors itself (or when
 * no tab does), otherwise the first tab that has some.
 */
export function tabWithErrors(errors: FormErrors, current: Locale): Locale | null {
  const counts = errorsByLocale(errors)
  if (counts[current] > 0) return null
  return locales.find((locale) => counts[locale] > 0) ?? null
}

/**
 * The note each language tab carries, so a problem on a hidden tab stays visible: how many of
 * its fields have an error or an unconfirmed review, or, with nothing to fix, that the record
 * has no text in that language yet.
 */
export function languageTabFlags<F extends string>(
  stored: StoredValues<F> | null,
  errors: FormErrors,
  needed: readonly ReviewConfirmation<NoInfer<F>>[],
  confirmed: readonly ReviewConfirmation<NoInfer<F>>[],
): Record<Locale, string | null> {
  return Object.fromEntries(
    locales.map((locale) => {
      const count = new Set([
        ...Object.keys(errors).filter((path) => path.startsWith(`content.${locale}.`)),
        ...needed
          .filter((review) => review.locale === locale && !isConfirmed(confirmed, review))
          .map((review) => contentPath(review.locale, review.field)),
      ]).size

      if (count > 0) return [locale, editorCopy.pending(count)]
      if (locale !== defaultLocale && stored?.[locale] === null) {
        return [locale, editorCopy.missingTranslation]
      }
      return [locale, null]
    }),
  ) as Record<Locale, string | null>
}

/**
 * The summary shown above the actions while anything is invalid, or `null` when nothing is.
 * `errors` may include the entity's shared fields; tabs are named only for content errors.
 */
export function errorSummary(errors: FormErrors, currentTab: Locale): string | null {
  const total = Object.keys(errors).length
  if (total === 0) return null

  const counts = errorsByLocale(errors)
  const otherTabs = locales
    .filter((locale) => locale !== currentTab && counts[locale] > 0)
    .map((locale) => localeLabels[locale])

  return editorCopy.errorSummary(total, otherTabs)
}

/**
 * The `content` of a request body: every field trimmed, and an optional field left blank sent as
 * `null`. The API validates it again; this only shapes it.
 */
export function toContentInput<S extends FieldSpecs>(
  definition: TranslatableContent<S>,
  draft: ContentDraft<FieldOf<S>>,
): ContentInput<S> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.fromEntries(
        definition.fields.map((field) => {
          const text = draft[locale][field].trim()
          return [field, text === '' && !definition.specs[field]?.required ? null : text]
        }),
      ) as LocalizedContent<S>,
    ]),
  ) as ContentInput<S>
}
