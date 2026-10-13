import type { defaultLocale, Locale } from '@/app/lib/i18n/config'

/**
 * The copy of translatable content: validation messages, the cross-language review texts and the
 * editor's notes around its language tabs. Every sentence is built from the field's name and the
 * locales involved, so no entity's field names are written here.
 *
 * The API speaks Spanish (`contentMessages`, `reviewCopy`, `editorCopy`). An editor speaks the
 * language the site is shown in, through `contentCopy[uiLocale]`. Adding a locale means naming
 * it in the records below and writing its `contentCopy` entry; each is a type error until it is.
 */

/** A field as a Spanish sentence names it. `gender` drives the article and the agreement. */
export interface SpanishNoun {
  /** Lowercase, without article: `'título'`, `'descripción'`. */
  readonly word: string
  readonly gender: 'm' | 'f'
}

/** How a sentence says "in this language": `'en español'`. */
export const inLanguage: Record<Locale, string> = { es: 'en español', en: 'en inglés' }

/** A language's name on its own: `'español'`. */
export const languageNames: Record<Locale, string> = { es: 'español', en: 'inglés' }

/** `'a'`, `'a y b'`, `'a, b y c'`. */
export function joinSpanish(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** `'el título'`, `'la descripción'`. */
export function withArticle(noun: SpanishNoun): string {
  return `${noun.gender === 'f' ? 'la' : 'el'} ${noun.word}`
}

/** The ending that agrees with `noun`: `agree(noun, 'obligatori')` is `'obligatorio'` or `'obligatoria'`. */
function agree(noun: SpanishNoun, stem: string): string {
  return `${stem}${noun.gender === 'f' ? 'a' : 'o'}`
}

/** `'en inglés'`, `'en español y en inglés'`. */
function inLanguages(locales: readonly Locale[]): string {
  return joinSpanish(locales.map((locale) => inLanguage[locale]))
}

/** Validation messages of a translatable content schema. */
export const contentMessages = {
  /** The whole `content` object is missing or is not an object. */
  missingContent: (locales: readonly Locale[]) =>
    `El contenido (content) debe incluir los idiomas ${joinSpanish(locales)}.`,

  /** One language's object is missing or is not an object. */
  missingLocale: (locale: Locale, fields: readonly string[]) =>
    `Falta el contenido ${inLanguage[locale]} (${joinSpanish(fields)}).`,

  /** A required field is absent or not text. */
  requiredNotText: (noun: SpanishNoun, locale: Locale) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} es ${agree(noun, 'obligatori')} y debe ser texto.`,

  /** A required field is empty or whitespace only. */
  required: (noun: SpanishNoun, locale: Locale) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} es ${agree(noun, 'obligatori')}.`,

  /** An optional field is neither text nor `null`. */
  optionalNotText: (noun: SpanishNoun, locale: Locale) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} debe ser texto o null.`,

  tooLong: (noun: SpanishNoun, locale: Locale, maxLength: number) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} no puede superar ${maxLength} caracteres.`,

  /** An optional field left empty in `locale` while it has text in `filled`. */
  requiredWithCounterpart: (noun: SpanishNoun, locale: Locale, filled: readonly Locale[]) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} es ${agree(noun, 'obligatori')} porque se completó ${inLanguages(filled)}.`,
}

/** Texts of the cross-language review. */
export const reviewCopy = {
  /**
   * `noun` changed in `changed` but not in `locale`. Used when every changed language already
   * had text, so something in it really changed.
   */
  counterpartChanged: (noun: SpanishNoun, locale: Locale, changed: readonly Locale[]) =>
    `Cambió ${withArticle(noun)} ${inLanguages(changed)}. Actualice ${withArticle(noun)} ${inLanguage[locale]} o confirme que sigue siendo ${agree(noun, 'correct')}.`,

  /**
   * `added` had no text yet: a legacy record is getting those languages for the first time.
   * Nothing in them "changed"; the point is that the text in `locale` predates languages and
   * may not be in `locale` at all.
   */
  versionAdded: (noun: SpanishNoun, locale: Locale, added: readonly Locale[]) =>
    `Al agregar ${added.length > 1 ? 'las versiones' : 'la versión'} en ${joinSpanish(added.map((each) => languageNames[each]))}, revise ${withArticle(noun)} ${inLanguage[locale]}: el texto original podría estar en otro idioma. Actualíce${noun.gender === 'f' ? 'la' : 'lo'} o confirme que es ${agree(noun, 'correct')}.`,

  /** The label of the switch that confirms `noun` in `locale` as still correct. */
  confirmation: (noun: SpanishNoun, locale: Locale) =>
    `${capitalize(withArticle(noun))} ${inLanguage[locale]} sigue siendo ${agree(noun, 'correct')}`,
}

/** Texts of a bilingual editor around its language tabs. */
export const editorCopy = {
  /** Under a field whose counterpart changed alone, next to the explanation and the switch. */
  fieldPending: 'Actualice este campo o confirme que sigue siendo correcto.',

  /** A language tab with problems: `'1 por revisar'`, `'2 por revisar'`. */
  pending: (count: number) => `${count} por revisar`,

  /** A language tab of a record that has no text in that language yet. */
  missingTranslation: 'Sin traducción',

  /** The summary above the actions, naming the other tabs that also have problems. */
  errorSummary: (total: number, otherTabs: readonly string[]) =>
    `${total === 1 ? 'Hay 1 campo por revisar.' : `Hay ${total} campos por revisar.`}${
      otherTabs.length > 0 ? ` Revise también la pestaña ${joinSpanish(otherTabs)}.` : ''
    }`,
}

/** How a field is named in each interface language: Spanish needs its gender for agreement. */
export interface FieldNaming {
  readonly noun: SpanishNoun
  /** The field's name in the other interface languages, lowercase: `{ en: 'name' }`. */
  readonly nouns?: { readonly [L in Exclude<Locale, typeof defaultLocale>]?: string }
}

/** Every text of translatable content, in one interface language. */
export interface ContentCopy {
  readonly missingContent: (locales: readonly Locale[]) => string
  readonly missingLocale: (locale: Locale, fields: readonly string[]) => string
  readonly requiredNotText: (field: FieldNaming, locale: Locale) => string
  readonly required: (field: FieldNaming, locale: Locale) => string
  readonly optionalNotText: (field: FieldNaming, locale: Locale) => string
  readonly tooLong: (field: FieldNaming, locale: Locale, maxLength: number) => string
  readonly requiredWithCounterpart: (
    field: FieldNaming,
    locale: Locale,
    filled: readonly Locale[],
  ) => string
  readonly counterpartChanged: (
    field: FieldNaming,
    locale: Locale,
    changed: readonly Locale[],
  ) => string
  readonly versionAdded: (field: FieldNaming, locale: Locale, added: readonly Locale[]) => string
  readonly confirmation: (field: FieldNaming, locale: Locale) => string
  readonly fieldPending: string
  readonly pending: (count: number) => string
  readonly missingTranslation: string
  /** `otherTabs` are the tabs' own labels (`'English'`), as the tabs show them. */
  readonly errorSummary: (total: number, otherTabs: readonly string[]) => string
}

const spanishCopy: ContentCopy = {
  missingContent: contentMessages.missingContent,
  missingLocale: contentMessages.missingLocale,
  requiredNotText: (field, locale) => contentMessages.requiredNotText(field.noun, locale),
  required: (field, locale) => contentMessages.required(field.noun, locale),
  optionalNotText: (field, locale) => contentMessages.optionalNotText(field.noun, locale),
  tooLong: (field, locale, maxLength) => contentMessages.tooLong(field.noun, locale, maxLength),
  requiredWithCounterpart: (field, locale, filled) =>
    contentMessages.requiredWithCounterpart(field.noun, locale, filled),
  counterpartChanged: (field, locale, changed) =>
    reviewCopy.counterpartChanged(field.noun, locale, changed),
  versionAdded: (field, locale, added) => reviewCopy.versionAdded(field.noun, locale, added),
  confirmation: (field, locale) => reviewCopy.confirmation(field.noun, locale),
  fieldPending: editorCopy.fieldPending,
  pending: editorCopy.pending,
  missingTranslation: editorCopy.missingTranslation,
  errorSummary: editorCopy.errorSummary,
}

/** A language's name as an English adjective: `'Spanish'`. */
export const englishLanguageNames: Record<Locale, string> = { es: 'Spanish', en: 'English' }

/** `'a'`, `'a and b'`, `'a, b and c'`. */
export function joinEnglish(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The field's English name, or its Spanish word when it has none. */
function englishNoun(field: FieldNaming): string {
  return field.nouns?.en ?? field.noun.word
}

/** `'The Spanish name'`, `'the English and Spanish name'`. */
function theField(field: FieldNaming, locales: readonly Locale[], capital = false): string {
  const languages = joinEnglish(locales.map((locale) => englishLanguageNames[locale]))
  return `${capital ? 'The' : 'the'} ${languages} ${englishNoun(field)}`
}

const englishCopy: ContentCopy = {
  missingContent: (locales) => `The content must include the languages ${joinEnglish(locales)}.`,
  missingLocale: (locale, fields) =>
    `The ${englishLanguageNames[locale]} content is missing (${joinEnglish(fields)}).`,
  requiredNotText: (field, locale) =>
    `${theField(field, [locale], true)} is required and must be text.`,
  required: (field, locale) => `${theField(field, [locale], true)} is required.`,
  optionalNotText: (field, locale) => `${theField(field, [locale], true)} must be text or null.`,
  tooLong: (field, locale, maxLength) =>
    `${theField(field, [locale], true)} cannot be longer than ${maxLength} characters.`,
  requiredWithCounterpart: (field, locale, filled) =>
    `${theField(field, [locale], true)} is required because ${theField(field, filled)} was filled in.`,
  counterpartChanged: (field, locale, changed) =>
    `${theField(field, changed, true)} changed. Update ${theField(field, [locale])} or confirm that it is still correct.`,
  versionAdded: (field, locale, added) =>
    `Since you are adding the ${joinEnglish(added.map((each) => englishLanguageNames[each]))} ${added.length > 1 ? 'versions' : 'version'}, check ${theField(field, [locale])}: the original text may be in another language. Update it or confirm that it is correct.`,
  confirmation: (field, locale) => `${theField(field, [locale], true)} is still correct`,
  fieldPending: 'Update this field or confirm that it is still correct.',
  pending: (count) => `${count} to review`,
  missingTranslation: 'No translation',
  errorSummary: (total, otherTabs) =>
    `${total === 1 ? 'There is 1 field to review.' : `There are ${total} fields to review.`}${
      otherTabs.length > 0
        ? ` Also check the ${joinEnglish(otherTabs)} ${otherTabs.length > 1 ? 'tabs' : 'tab'}.`
        : ''
    }`,
}

/** The copy an editor shows, in the language the site is shown in. */
export const contentCopy: Record<Locale, ContentCopy> = { es: spanishCopy, en: englishCopy }
