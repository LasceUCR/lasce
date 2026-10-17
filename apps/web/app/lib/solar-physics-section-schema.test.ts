import { describe, expect, test } from 'vitest'

import {
  solarPhysicsSectionContent,
  solarPhysicsSectionUpdateSchema,
  splitParagraphs,
  translationLocales,
} from './solar-physics-section-schema'

const VERSION = '2026-01-01T00:00:00.000Z'

const content = {
  es: { title: 'Título', body: 'Primer párrafo.\n\nSegundo párrafo.' },
  en: { title: 'Title', body: 'First paragraph.\n\nSecond paragraph.' },
}

function issuesOf(input: unknown) {
  const result = solarPhysicsSectionUpdateSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

describe('solar physics section content', () => {
  test('is a title and a text, stored in translations for every locale but Spanish', () => {
    expect(solarPhysicsSectionContent.fields).toEqual(['title', 'body'])
    expect(translationLocales).toEqual(['en'])
  })
})

describe('solarPhysicsSectionUpdateSchema', () => {
  test('accepts the content in both languages with the version', () => {
    const result = solarPhysicsSectionUpdateSchema.safeParse({ version: VERSION, content })

    expect(result.success).toBe(true)
  })

  test('trims the text it keeps', () => {
    const result = solarPhysicsSectionUpdateSchema.safeParse({
      version: VERSION,
      content: { ...content, es: { title: '  Título  ', body: '  Texto.  ' } },
    })

    expect(result.success && result.data.content.es).toEqual({ title: 'Título', body: 'Texto.' })
  })

  test('requires the content: the section has no shared fields to update instead', () => {
    expect(issuesOf({ version: VERSION })).toEqual([
      { path: 'content', message: 'El contenido (content) debe incluir los idiomas es y en.' },
    ])
  })

  test('requires the version it was loaded with', () => {
    expect(issuesOf({ content }).map((issue) => issue.path)).toContain('version')
  })

  test('rejects an empty title or text in either language', () => {
    expect(
      issuesOf({
        version: VERSION,
        content: { es: { title: '   ', body: 'Texto.' }, en: { title: 'Title', body: '' } },
      }),
    ).toEqual([
      { path: 'content.es.title', message: 'El título en español es obligatorio.' },
      { path: 'content.en.body', message: 'El texto en inglés es obligatorio.' },
    ])
  })

  test('rejects a title over 160 characters and a text over 5000', () => {
    expect(
      issuesOf({
        version: VERSION,
        content: {
          es: { title: 'a'.repeat(161), body: 'b'.repeat(5001) },
          en: { title: 'Title', body: 'Text.' },
        },
      }),
    ).toEqual([
      {
        path: 'content.es.title',
        message: 'El título en español no puede superar 160 caracteres.',
      },
      { path: 'content.es.body', message: 'El texto en español no puede superar 5000 caracteres.' },
    ])
  })

  test('accepts confirmations of the fields it knows and nothing else', () => {
    const confirmed = solarPhysicsSectionUpdateSchema.safeParse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'body' }],
    })
    const unknown = solarPhysicsSectionUpdateSchema.safeParse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'summary' }],
    })

    expect(confirmed.success).toBe(true)
    expect(unknown.success).toBe(false)
  })

  test('rejects keys it does not know', () => {
    const result = solarPhysicsSectionUpdateSchema.safeParse({
      version: VERSION,
      content,
      extra: 1,
    })

    expect(result.success).toBe(false)
  })
})

describe('splitParagraphs', () => {
  test('splits at blank lines', () => {
    expect(splitParagraphs('Uno.\n\nDos.\n\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.'])
  })

  test('treats a line of spaces as blank and trims every paragraph', () => {
    expect(splitParagraphs('  Uno.  \n   \n\tDos.\t')).toEqual(['Uno.', 'Dos.'])
  })

  test('keeps a single line break inside its paragraph', () => {
    expect(splitParagraphs('Línea uno\nlínea dos\n\nOtra.')).toEqual([
      'Línea uno\nlínea dos',
      'Otra.',
    ])
  })

  test('drops empty paragraphs', () => {
    expect(splitParagraphs('\n\nUno.\n\n\n\n')).toEqual(['Uno.'])
    expect(splitParagraphs('   ')).toEqual([])
  })
})
