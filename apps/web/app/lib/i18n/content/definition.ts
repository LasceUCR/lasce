import { z } from 'zod'

import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'

import { contentMessages, type SpanishNoun } from './messages'

/**
 * Translatable database content: the fields an entity writes once per language, and the Zod
 * schema that validates them in every supported locale.
 *
 * Storage follows one pattern for every entity (see `docs/internationalization.md`): the
 * default locale's text lives on the entity's own row, and every other locale in a
 * `<entity>_translations` row keyed by `(<entity>_id, locale)`. This module knows nothing about
 * any particular entity, Prisma, React or Next.js, so it runs on the server, in the browser and
 * in tests alike.
 */

/** One field written once per language. */
export interface TranslatableFieldSpec {
  /** How messages name the field: `{ word: 'título', gender: 'm' }`. */
  readonly noun: SpanishNoun
  /**
   * Required fields must have text in every locale. Optional fields are **all-or-none**: empty
   * in every locale, or filled in every locale. That is the initial policy, which keeps "no
   * invented translations" true without a per-field fallback. An entity that needs a field
   * filled in some languages only must extend this spec with an explicit policy and fallback.
   */
  readonly required: boolean
  /** Maximum length after trimming, in UTF-16 code units (what `string.length` counts). */
  readonly maxLength?: number
}

export type FieldSpecs = { readonly [field: string]: TranslatableFieldSpec }

export type FieldOf<S extends FieldSpecs> = Extract<keyof S, string>

/** One locale's text. Required fields are strings; optional ones are `null` when empty. */
export type LocalizedContent<S extends FieldSpecs> = {
  [K in FieldOf<S>]: S[K]['required'] extends true ? string : string | null
}

/** Every locale's text, as validated input to a create or a content update. */
export type ContentInput<S extends FieldSpecs> = { [L in Locale]: LocalizedContent<S> }

/** Every locale except the default one: the locales stored in a translations table. */
export type TranslationLocale = Exclude<Locale, typeof defaultLocale>

export const translationLocales: readonly TranslationLocale[] = locales.filter(
  (locale): locale is TranslationLocale => locale !== defaultLocale,
)

/**
 * A record's text in every locale, as stored. The default locale lives on the base row and is
 * always present; another locale is `null` while the record has no translation row for it.
 */
export type StoredContent<S extends FieldSpecs> = {
  [L in Locale]: L extends typeof defaultLocale ? LocalizedContent<S> : LocalizedContent<S> | null
}

/** A field kept as is in one locale while its counterpart changed, confirmed by the editor. */
export type ReviewConfirmation<F extends string = string> = { locale: Locale; field: F }

export interface TranslatableContent<S extends FieldSpecs> {
  readonly specs: S
  /** The field names, in the order they were defined. */
  readonly fields: readonly FieldOf<S>[]
  /**
   * The `content` body: an object per supported locale, each with exactly the defined fields.
   * Text is trimmed; blank required text is rejected; blank optional text becomes `null`; an
   * optional field filled in some locales only is rejected at the empty locales' paths.
   */
  readonly schema: z.ZodType<ContentInput<S>>
  readonly confirmationSchema: z.ZodType<ReviewConfirmation<FieldOf<S>>>
  /** A list of confirmations, no longer than the number of locale and field pairs. */
  readonly confirmationsSchema: z.ZodType<ReviewConfirmation<FieldOf<S>>[]>
}

/** `specs[field]` for a field known to be defined (the index signature cannot say so). */
function specOf<S extends FieldSpecs>(specs: S, field: FieldOf<S>): TranslatableFieldSpec {
  return specs[field] as TranslatableFieldSpec
}

/** Field names become paths such as `content.en.name`, so they cannot contain dots. */
const FIELD_NAME = /^[A-Za-z][A-Za-z0-9]*$/

function requiredText(noun: SpanishNoun, locale: Locale, maxLength: number | undefined) {
  const text = z
    .string({ error: contentMessages.requiredNotText(noun, locale) })
    .trim()
    .min(1, contentMessages.required(noun, locale))

  return maxLength === undefined
    ? text
    : text.max(maxLength, contentMessages.tooLong(noun, locale, maxLength))
}

/** Absent, `null`, empty and whitespace-only all become `null`; other text is trimmed. */
function optionalText(noun: SpanishNoun, locale: Locale, maxLength: number | undefined) {
  const text =
    maxLength === undefined
      ? z.string()
      : z.string().max(maxLength, contentMessages.tooLong(noun, locale, maxLength))

  return z
    .union([z.null(), z.string()], { error: contentMessages.optionalNotText(noun, locale) })
    .optional()
    .transform((value) => value?.trim() || null)
    .pipe(text.nullable())
}

function localeSchema<S extends FieldSpecs>(
  specs: S,
  fields: readonly FieldOf<S>[],
  locale: Locale,
) {
  const shape = Object.fromEntries(
    fields.map((field) => {
      const { noun, required, maxLength } = specOf(specs, field)
      return [
        field,
        required ? requiredText(noun, locale, maxLength) : optionalText(noun, locale, maxLength),
      ]
    }),
  )

  return z.strictObject(shape, { error: contentMessages.missingLocale(locale, fields) })
}

function contentSchema<S extends FieldSpecs>(specs: S, fields: readonly FieldOf<S>[]) {
  const schema = z.strictObject(
    Object.fromEntries(locales.map((locale) => [locale, localeSchema(specs, fields, locale)])),
    { error: contentMessages.missingContent(locales) },
  )

  const optionalFields = fields.filter((field) => !specOf(specs, field).required)
  if (optionalFields.length === 0) return schema

  return schema.superRefine((content, context) => {
    const values = content as Record<Locale, Record<string, string | null>>

    for (const field of optionalFields) {
      const filled = locales.filter((locale) => values[locale][field] !== null)
      if (filled.length === 0 || filled.length === locales.length) continue

      for (const locale of locales) {
        if (filled.includes(locale)) continue
        context.addIssue({
          code: 'custom',
          path: [locale, field],
          message: contentMessages.requiredWithCounterpart(
            specOf(specs, field).noun,
            locale,
            filled,
          ),
        })
      }
    }
  })
}

/**
 * Defines an entity's translatable fields. Call it once, at module scope, next to the entity's
 * other schemas:
 *
 * ```ts
 * export const eventContent = defineTranslatableContent({
 *   name: { noun: { word: 'nombre', gender: 'm' }, required: true, maxLength: 120 },
 *   summary: { noun: { word: 'descripción', gender: 'f' }, required: false },
 * })
 * ```
 *
 * Shared fields (dates, links, relations) are not part of it: they stay in the entity's own
 * schema, written once.
 *
 * @throws when there is no field, a field name is not alphanumeric, or a `maxLength` is not a
 * positive integer: definition mistakes, caught as soon as the module loads.
 */
export function defineTranslatableContent<const S extends FieldSpecs>(
  specs: S,
): TranslatableContent<S> {
  const fields = Object.keys(specs) as FieldOf<S>[]

  if (fields.length === 0) {
    throw new Error('A translatable content definition needs at least one field.')
  }

  for (const field of fields) {
    if (!FIELD_NAME.test(field)) {
      throw new Error(
        `Invalid translatable field name "${field}": use letters and digits only, starting with a letter.`,
      )
    }

    const { maxLength } = specOf(specs, field)
    if (maxLength !== undefined && (!Number.isInteger(maxLength) || maxLength < 1)) {
      throw new Error(`The maxLength of "${field}" must be a positive integer.`)
    }
  }

  const confirmationSchema = z.strictObject({
    locale: z.enum(locales),
    field: z.enum(fields as [FieldOf<S>, ...FieldOf<S>[]]),
  })

  return Object.freeze({
    specs,
    fields: Object.freeze([...fields]),
    schema: contentSchema(specs, fields) as unknown as z.ZodType<ContentInput<S>>,
    confirmationSchema: confirmationSchema as z.ZodType<ReviewConfirmation<FieldOf<S>>>,
    confirmationsSchema: z
      .array(confirmationSchema)
      .max(locales.length * fields.length) as z.ZodType<ReviewConfirmation<FieldOf<S>>[]>,
  })
}
