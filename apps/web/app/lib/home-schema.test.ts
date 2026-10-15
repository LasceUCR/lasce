import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }

import {
  INDICATOR_TEXT_MAX,
  heroUpdateSchema,
  indicatorCodes,
  indicatorOrderSchema,
  indicatorTones,
  indicatorUpdateSchema,
  indicatorValueSchema,
  isIndicatorCode,
} from './home-schema'

const VERSION = '2026-10-14T10:00:00.000Z'
const ID_A = '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10'
const ID_B = '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60'

const heroContentBody = {
  es: { title: 'Exploramos el Sol', lead: 'Investigamos la actividad solar.' },
  en: { title: 'We explore the Sun', lead: 'We study solar activity.' },
}

function issues(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

describe('heroUpdateSchema', () => {
  test('accepts both languages in full and trims them', () => {
    const result = heroUpdateSchema.parse({
      version: VERSION,
      content: {
        es: { title: '  Exploramos el Sol  ', lead: 'Investigamos.' },
        en: { title: 'We explore the Sun', lead: ' We study. ' },
      },
    })

    expect(result.content.es.title).toBe('Exploramos el Sol')
    expect(result.content.en.lead).toBe('We study.')
  })

  test('requires the title and the subtitle in every language, by path and in Spanish', () => {
    const result = heroUpdateSchema.safeParse({
      version: VERSION,
      content: { es: { title: ' ', lead: 'Investigamos.' }, en: { title: 'Title', lead: '' } },
    })

    expect(issues(result)).toEqual([
      { path: 'content.es.title', message: 'El título en español es obligatorio.' },
      { path: 'content.en.lead', message: 'El subtítulo en inglés es obligatorio.' },
    ])
  })

  test('caps the title at 120 and the subtitle at 300 characters', () => {
    const result = heroUpdateSchema.safeParse({
      version: VERSION,
      content: {
        es: { title: 'a'.repeat(121), lead: 'b'.repeat(301) },
        en: { title: 'a'.repeat(120), lead: 'b'.repeat(300) },
      },
    })

    expect(issues(result).map((issue) => issue.path)).toEqual([
      'content.es.title',
      'content.es.lead',
    ])
  })

  test('requires the version the editor loaded and the content', () => {
    expect(issues(heroUpdateSchema.safeParse({ content: heroContentBody }))).toEqual([
      {
        path: 'version',
        message: 'La versión de la portada es obligatoria y debe ser la que se cargó.',
      },
    ])
    expect(
      issues(heroUpdateSchema.safeParse({ version: VERSION })).map((issue) => issue.path),
    ).toEqual(['content'])
  })

  test('rejects unknown keys, such as a shared field the banner does not have', () => {
    const result = heroUpdateSchema.safeParse({
      version: VERSION,
      content: heroContentBody,
      cta: 'Conoce más',
    })

    expect(result.success).toBe(false)
  })

  test('accepts confirmations of an unchanged counterpart', () => {
    const result = heroUpdateSchema.parse({
      version: VERSION,
      content: heroContentBody,
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(result.confirmedUnchanged).toEqual([{ locale: 'en', field: 'title' }])
  })
})

describe('indicatorUpdateSchema', () => {
  const content = { es: { description: 'Estable' }, en: { description: 'Stable' } }

  test('accepts a value alone, without touching the description', () => {
    expect(indicatorUpdateSchema.parse({ version: VERSION, value: ' -12 nT ' })).toEqual({
      version: VERSION,
      value: '-12 nT',
    })
  })

  test('accepts a description in every language alone', () => {
    expect(indicatorUpdateSchema.parse({ version: VERSION, content }).content).toEqual(content)
  })

  test(`caps the value at ${INDICATOR_TEXT_MAX} characters`, () => {
    expect(
      indicatorUpdateSchema.safeParse({ version: VERSION, value: 'x'.repeat(15) }).success,
    ).toBe(true)
    expect(
      issues(indicatorUpdateSchema.safeParse({ version: VERSION, value: 'x'.repeat(16) })),
    ).toEqual([{ path: 'value', message: 'El valor no puede superar los 15 caracteres.' }])
  })

  test(`caps the description at ${INDICATOR_TEXT_MAX} characters in every language`, () => {
    const result = indicatorUpdateSchema.safeParse({
      version: VERSION,
      content: { es: { description: 'Actividad baja!' }, en: { description: 'Low activity!!!!' } },
    })

    expect(issues(result).map((issue) => issue.path)).toEqual(['content.en.description'])
  })

  test('requires a non-blank value and description in both languages', () => {
    const result = indicatorUpdateSchema.safeParse({
      version: VERSION,
      value: '   ',
      content: { es: { description: 'Estable' }, en: { description: ' ' } },
    })

    expect(issues(result)).toEqual([
      { path: 'value', message: 'El valor es obligatorio.' },
      { path: 'content.en.description', message: 'La descripción en inglés es obligatoria.' },
    ])
  })

  test('refuses a request with nothing to update', () => {
    expect(issues(indicatorUpdateSchema.safeParse({ version: VERSION }))).toEqual([
      { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
    ])
  })

  test('refuses confirmations without content', () => {
    const result = indicatorUpdateSchema.safeParse({
      version: VERSION,
      value: '2',
      confirmedUnchanged: [{ locale: 'en', field: 'description' }],
    })

    expect(issues(result)).toEqual([
      {
        path: 'confirmedUnchanged',
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      },
    ])
  })

  test('rejects the fields a CMS edit cannot write', () => {
    for (const field of ['code', 'position', 'source', 'observedAt']) {
      expect(
        indicatorUpdateSchema.safeParse({ version: VERSION, value: '2', [field]: 'x' }).success,
      ).toBe(false)
    }
  })
})

describe('indicatorValueSchema', () => {
  test('speaks the language of the messages it is built with', () => {
    const result = indicatorValueSchema(en.home.validation).safeParse('')

    expect(result.error?.issues[0]?.message).toBe('The value is required.')
  })
})

describe('indicatorOrderSchema', () => {
  test('accepts every id once, writing to `position` unless told otherwise', () => {
    expect(indicatorOrderSchema.parse({ ids: [ID_A, ID_B] })).toEqual({
      ids: [ID_A, ID_B],
      positionField: 'position',
    })
    expect(
      indicatorOrderSchema.parse({ ids: [ID_A], positionField: 'position' }).positionField,
    ).toBe('position')
  })

  test('refuses a position column the indices do not have', () => {
    expect(
      issues(indicatorOrderSchema.safeParse({ ids: [ID_A], positionField: 'description' })),
    ).toEqual([
      {
        path: 'positionField',
        message: 'El campo de posición no existe en los índices geomagnéticos.',
      },
    ])
  })

  test('refuses repeated ids, ids that are not UUIDs and an empty list', () => {
    expect(issues(indicatorOrderSchema.safeParse({ ids: [ID_A, ID_A] }))).toEqual([
      { path: 'ids', message: 'El orden no puede repetir un índice.' },
    ])
    expect(issues(indicatorOrderSchema.safeParse({ ids: ['kp'] }))).toEqual([
      { path: 'ids.0', message: 'Cada identificador de índice debe ser un UUID.' },
    ])
    expect(issues(indicatorOrderSchema.safeParse({ ids: [] }))).toEqual([
      { path: 'ids', message: 'El orden debe incluir al menos un índice.' },
    ])
    expect(issues(indicatorOrderSchema.safeParse({ ids: 'kp' }))).toEqual([
      { path: 'ids', message: 'El orden (ids) debe ser una lista de identificadores.' },
    ])
  })
})

describe('indicator codes', () => {
  test('every seeded code has a tone and a label in both catalogues', () => {
    for (const code of indicatorCodes) {
      expect(indicatorTones[code]).toBeDefined()
      expect(en.home.indicators[code].label).not.toBe('')
    }
  })

  test('recognizes only the seeded codes', () => {
    expect(isIndicatorCode('kp')).toBe(true)
    expect(isIndicatorCode('bz')).toBe(false)
  })
})
