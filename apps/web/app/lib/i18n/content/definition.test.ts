import { describe, expect, expectTypeOf, test } from 'vitest'
import type { z } from 'zod'

import { defaultLocale, locales } from '@/app/lib/i18n/config'

import {
  defineTranslatableContent,
  translationLocales,
  type ContentInput,
  type LocalizedContent,
  type ReviewConfirmation,
} from './definition'
import { inLanguage } from './messages'
import { altTextContent, eventContent, profileContent } from './test-fixtures'

function problems(result: { success: boolean; error?: z.ZodError }) {
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

const event = {
  es: { name: 'Taller de radioastronomía', summary: 'Sesión práctica.' },
  en: { name: 'Radio astronomy workshop', summary: 'Hands-on session.' },
}

describe('defineTranslatableContent', () => {
  test('keeps the fields in the order they were defined', () => {
    expect(eventContent.fields).toEqual(['name', 'summary'])
    expect(profileContent.fields).toEqual(['role', 'biography', 'motto'])
  })

  test('returns a frozen definition', () => {
    expect(Object.isFrozen(eventContent)).toBe(true)
    expect(Object.isFrozen(eventContent.fields)).toBe(true)
  })

  test('rejects a definition without fields', () => {
    expect(() => defineTranslatableContent({})).toThrow('at least one field')
  })

  test.each(['content.name', '1name', 'first-name', 'first name', ''])(
    'rejects the field name %j',
    (field) => {
      expect(() =>
        defineTranslatableContent({
          [field]: { noun: { word: 'x', gender: 'm' }, required: true },
        }),
      ).toThrow('Invalid translatable field name')
    },
  )

  test.each([0, -1, 1.5, Number.NaN])('rejects a maxLength of %s', (maxLength) => {
    expect(() =>
      defineTranslatableContent({
        name: { noun: { word: 'nombre', gender: 'm' }, required: true, maxLength },
      }),
    ).toThrow('positive integer')
  })
})

describe('translationLocales', () => {
  test('lists every supported locale except the default one', () => {
    expect(translationLocales).toEqual(locales.filter((locale) => locale !== defaultLocale))
  })
})

describe('content schema', () => {
  test('accepts every locale with every field and trims the text', () => {
    const result = eventContent.schema.safeParse({
      es: { name: '  Taller  ', summary: ' Sesión. ' },
      en: { name: 'Workshop', summary: 'Session.' },
    })

    expect(result.data).toEqual({
      es: { name: 'Taller', summary: 'Sesión.' },
      en: { name: 'Workshop', summary: 'Session.' },
    })
  })

  test('stores an absent, null, empty or blank optional field as null', () => {
    const result = eventContent.schema.safeParse({
      es: { name: 'Taller' },
      en: { name: 'Workshop', summary: '   ' },
    })
    expect(result.data).toEqual({
      es: { name: 'Taller', summary: null },
      en: { name: 'Workshop', summary: null },
    })

    expect(
      eventContent.schema.safeParse({
        es: { name: 'Taller', summary: null },
        en: { name: 'Workshop', summary: '' },
      }).success,
    ).toBe(true)
  })

  test('requires every supported locale', () => {
    for (const missing of locales) {
      const input = Object.fromEntries(
        locales.filter((locale) => locale !== missing).map((locale) => [locale, event[locale]]),
      )
      const result = eventContent.schema.safeParse(input)

      expect(problems(result)).toEqual([
        {
          path: missing,
          message: `Falta el contenido ${inLanguage[missing]} (name y summary).`,
        },
      ])
    }
  })

  test('rejects content that is not an object', () => {
    for (const value of [undefined, null, 'texto', []]) {
      expect(problems(eventContent.schema.safeParse(value))).toEqual([
        { path: '', message: 'El contenido (content) debe incluir los idiomas es y en.' },
      ])
    }
  })

  test('rejects a blank or missing required field in the language it is missing from', () => {
    expect(
      problems(eventContent.schema.safeParse({ ...event, en: { ...event.en, name: '   ' } })),
    ).toEqual([{ path: 'en.name', message: 'El nombre en inglés es obligatorio.' }])

    expect(problems(eventContent.schema.safeParse({ ...event, es: { summary: 'x' } }))).toEqual([
      { path: 'es.name', message: 'El nombre en español es obligatorio y debe ser texto.' },
    ])
  })

  test('agrees each message with the field gender', () => {
    const result = profileContent.schema.safeParse({
      es: { role: 'Investigadora', biography: ' ' },
      en: { role: 'Researcher', biography: 'Bio.' },
    })

    expect(problems(result)).toEqual([
      { path: 'es.biography', message: 'La biografía en español es obligatoria.' },
    ])
  })

  test('rejects an optional field that is neither text nor null', () => {
    expect(
      problems(eventContent.schema.safeParse({ ...event, en: { name: 'Workshop', summary: 3 } })),
    ).toEqual([{ path: 'en.summary', message: 'La descripción en inglés debe ser texto o null.' }])
  })

  test('applies maxLength after trimming, to required and optional fields', () => {
    const name = 'n'.repeat(80)
    expect(
      eventContent.schema.safeParse({ ...event, es: { ...event.es, name: `  ${name}  ` } }).success,
    ).toBe(true)

    expect(
      problems(eventContent.schema.safeParse({ ...event, es: { ...event.es, name: `${name}n` } })),
    ).toEqual([
      { path: 'es.name', message: 'El nombre en español no puede superar 80 caracteres.' },
    ])

    const profile = {
      es: { role: 'Investigador', biography: 'Bio.', motto: 'm'.repeat(41) },
      en: { role: 'Researcher', biography: 'Bio.', motto: 'Motto' },
    }
    expect(problems(profileContent.schema.safeParse(profile))).toEqual([
      { path: 'es.motto', message: 'El lema en español no puede superar 40 caracteres.' },
    ])
  })

  test('trims optional text before checking maxLength and normalizes blank values', () => {
    const shortOptionalContent = defineTranslatableContent({
      label: { noun: { word: 'etiqueta', gender: 'f' }, required: false, maxLength: 1 },
    })

    const trimmed = shortOptionalContent.schema.safeParse({
      es: { label: '  x  ' },
      en: { label: '  x  ' },
    })
    expect(trimmed).toMatchObject({
      success: true,
      data: { es: { label: 'x' }, en: { label: 'x' } },
    })

    expect(
      shortOptionalContent.schema.safeParse({
        es: { label: '  xx  ' },
        en: { label: '  xx  ' },
      }).success,
    ).toBe(false)

    for (const [es, en] of [[null, null], ['', ''], ['   ', '   ']]) {
      expect(
        shortOptionalContent.schema.safeParse({ es: { label: es }, en: { label: en } }),
      ).toMatchObject({
        success: true,
        data: { es: { label: null }, en: { label: null } },
      })
    }
  })

  test('requires an optional field in every locale once it is filled in one', () => {
    const result = eventContent.schema.safeParse({
      es: { name: 'Taller', summary: 'Sesión práctica.' },
      en: { name: 'Workshop', summary: '  ' },
    })

    expect(problems(result)).toEqual([
      {
        path: 'en.summary',
        message: 'La descripción en inglés es obligatoria porque se completó en español.',
      },
    ])
  })

  test('rejects an unsupported locale and a field that is not defined', () => {
    const issues = eventContent.schema.safeParse({
      ...event,
      fr: { name: 'Atelier' },
      en: { ...event.en, title: 'Workshop' },
    }).error?.issues

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unrecognized_keys', path: [], keys: ['fr'] }),
        expect.objectContaining({ code: 'unrecognized_keys', path: ['en'], keys: ['title'] }),
      ]),
    )
  })

  test('works with a single field', () => {
    expect(
      altTextContent.schema.safeParse({ es: { altText: 'Antena' }, en: { altText: 'Antenna' } })
        .success,
    ).toBe(true)

    expect(problems(altTextContent.schema.safeParse({ es: { altText: 'Antena' } }))).toEqual([
      { path: 'en', message: 'Falta el contenido en inglés (altText).' },
    ])

    expect(
      problems(altTextContent.schema.safeParse({ es: { altText: '' }, en: { altText: 'x' } })),
    ).toEqual([{ path: 'es.altText', message: 'El texto alternativo en español es obligatorio.' }])
  })
})

describe('confirmation schemas', () => {
  test('accept a supported locale and a defined field', () => {
    expect(
      eventContent.confirmationSchema.safeParse({ locale: 'en', field: 'summary' }).data,
    ).toEqual({ locale: 'en', field: 'summary' })
  })

  test.each([
    { locale: 'en', field: 'title' },
    { locale: 'fr', field: 'name' },
    { locale: 'en', field: 'name', extra: true },
    { locale: 'en' },
  ])('reject %j', (confirmation) => {
    expect(eventContent.confirmationSchema.safeParse(confirmation).success).toBe(false)
  })

  test('accept no more confirmations than locale and field pairs', () => {
    const all = locales.flatMap((locale) => eventContent.fields.map((field) => ({ locale, field })))

    expect(eventContent.confirmationsSchema.safeParse(all).success).toBe(true)
    expect(eventContent.confirmationsSchema.safeParse([...all, all[0]]).success).toBe(false)
  })
})

describe('types', () => {
  test('type required fields as strings and optional fields as nullable strings', () => {
    expectTypeOf<LocalizedContent<typeof eventContent.specs>>().toEqualTypeOf<{
      name: string
      summary: string | null
    }>()
    expectTypeOf<z.infer<typeof profileContent.schema>>().toEqualTypeOf<
      ContentInput<typeof profileContent.specs>
    >()
    expectTypeOf<z.infer<typeof eventContent.confirmationSchema>>().toEqualTypeOf<
      ReviewConfirmation<'name' | 'summary'>
    >()
  })
})
