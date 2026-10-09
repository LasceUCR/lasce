import { defaultLocale, type Locale } from '@/app/lib/i18n/config'

import {
  translationLocales,
  type ContentInput,
  type FieldOf,
  type FieldSpecs,
  type LocalizedContent,
  type StoredContent,
  type TranslatableContent,
  type TranslationLocale,
} from './definition'

/**
 * Reading and writing translatable content in its two places: the base row (default locale)
 * and the translation rows (every other locale). These functions only shape values; the entity's
 * service runs the queries.
 *
 * Fallback is per record, not per field: a locale without a translation row shows the base text
 * instead, flagged as being in an unknown language. A complete record never needs a per-field
 * fallback, because required fields are present in every locale and optional fields are
 * all-or-none.
 */

/** A translation row as the database returns it. Its `locale` is not trusted to be supported. */
export type TranslationRow<S extends FieldSpecs> = { readonly locale: string } & LocalizedContent<S>

function pick<S extends FieldSpecs>(
  fields: readonly FieldOf<S>[],
  source: LocalizedContent<S>,
): LocalizedContent<S> {
  return Object.fromEntries(fields.map((field) => [field, source[field]])) as LocalizedContent<S>
}

/**
 * A record's text in every locale, from its base row and its translation rows. Only the
 * definition's fields are kept, so the base row can be passed as loaded, with all its other
 * columns. Rows for a locale that is not supported (anymore) are ignored.
 */
export function storedContentFrom<S extends FieldSpecs>(
  definition: TranslatableContent<S>,
  base: LocalizedContent<S>,
  rows: readonly TranslationRow<S>[],
): StoredContent<S> {
  const content: Partial<Record<Locale, LocalizedContent<S> | null>> = {
    [defaultLocale]: pick(definition.fields, base),
  }

  for (const locale of translationLocales) {
    const row = rows.find((each) => each.locale === locale)
    content[locale] = row ? pick(definition.fields, row) : null
  }

  return content as StoredContent<S>
}

/**
 * True when the record lacks a translation row for some locale. Such a record predates
 * translations: its base text is in whatever language it was entered in, which is not
 * necessarily the default locale. Detection is implicit on purpose: there is no status column,
 * and a record becomes complete when a save writes every translation row.
 */
export function isLegacyContent(stored: { readonly [L in Locale]: object | null }): boolean {
  return translationLocales.some((locale) => stored[locale] === null)
}

export interface ResolvedContent<S extends FieldSpecs> {
  /** The text to show. */
  content: LocalizedContent<S>
  /**
   * The language `content` is actually in: the requested locale when the record has it, else
   * the default locale for a complete record, else `null` for a legacy record's base text,
   * whose language is unknown.
   */
  contentLocale: Locale | null
  isLegacy: boolean
}

/** The text to show a visitor reading in `locale`, falling back to the base text. */
export function resolveContent<S extends FieldSpecs>(
  stored: StoredContent<S>,
  locale: Locale,
): ResolvedContent<S> {
  const isLegacy = isLegacyContent(stored)
  const translated = locale === defaultLocale ? null : stored[locale]

  if (translated) return { content: translated, contentLocale: locale, isLegacy }

  return {
    content: stored[defaultLocale],
    contentLocale: isLegacy ? null : defaultLocale,
    isLegacy,
  }
}

/**
 * The `lang` attribute for an element holding resolved content: the locale, `''` (unknown
 * language, so assistive technology does not assume the page's) when it is `null`, and no
 * attribute when the language was not resolved at all.
 */
export function contentLangAttribute(contentLocale: Locale | null | undefined): string | undefined {
  if (contentLocale === undefined) return undefined
  return contentLocale ?? ''
}

/** The base row's translatable columns for `input`: its default-locale text. */
export function baseContent<S extends FieldSpecs>(
  definition: TranslatableContent<S>,
  input: ContentInput<S>,
): LocalizedContent<S> {
  return pick(definition.fields, input[defaultLocale])
}

/** One translation row per non-default locale for `input`, ready to create or upsert. */
export function translationRows<S extends FieldSpecs>(
  definition: TranslatableContent<S>,
  input: ContentInput<S>,
): ({ locale: TranslationLocale } & LocalizedContent<S>)[] {
  return translationLocales.map((locale) => ({
    locale,
    ...pick(definition.fields, input[locale]),
  }))
}
