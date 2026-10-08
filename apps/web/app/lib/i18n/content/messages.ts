import type { Locale } from '@/app/lib/i18n/config'

/**
 * The Spanish copy of translatable content: validation messages and the cross-language review
 * texts. People editing content read Spanish whatever the public language, so these strings are
 * not catalogue messages. Every sentence is built from the field's noun and the locales
 * involved, so no entity's field names are written here, and adding a locale only means naming
 * it in the two records below (each is a type error until it does).
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
