import { defineTranslatableContent } from './definition'

/**
 * Fictitious entities for the tests of the shared content core. None of them has a Prisma
 * model, a route or a page. Their field names, optionality and genders differ on purpose from
 * any real entity's, so a test passes only if the shared code reads the definition instead of
 * assuming particular fields.
 */

/** A required field with a length limit and an optional feminine field, both named in English. */
export const eventContent = defineTranslatableContent({
  name: {
    noun: { word: 'nombre', gender: 'm' },
    nouns: { en: 'name' },
    required: true,
    maxLength: 80,
  },
  summary: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'summary' },
    required: false,
  },
})

/** A single required field with a multi-word noun and no English name. */
export const altTextContent = defineTranslatableContent({
  altText: { noun: { word: 'texto alternativo', gender: 'm' }, required: true },
})

/** Two required fields of different genders and an optional one with a length limit. */
export const profileContent = defineTranslatableContent({
  role: { noun: { word: 'cargo', gender: 'm' }, required: true },
  biography: { noun: { word: 'biografía', gender: 'f' }, required: true, maxLength: 2000 },
  motto: { noun: { word: 'lema', gender: 'm' }, required: false, maxLength: 40 },
})
