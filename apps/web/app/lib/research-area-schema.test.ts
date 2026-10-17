import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }

import {
  researchAreaCreateSchema,
  researchAreaSrcSchema,
  researchAreaUpdateSchema,
} from './research-area-schema'

const VERSION = '2026-10-15T10:00:00.000Z'

const content = {
  es: { title: 'Geomagnetismo', description: 'Estudia el campo magnético.' },
  en: { title: 'Geomagnetism', description: 'Studies the magnetic field.' },
}

function issues(result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}): { path: string; message: string }[] {
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

describe('researchAreaCreateSchema', () => {
  test('accepts the title and description in every language and the photo, trimmed', () => {
    const result = researchAreaCreateSchema.parse({
      content: { ...content, es: { title: '  Geomagnetismo ', description: 'Estudia.' } },
      src: ' /images/research/area.jpg ',
    })

    expect(result.content.es.title).toBe('Geomagnetismo')
    expect(result.src).toBe('/images/research/area.jpg')
  })

  test('requires the title and the description in both languages, by path and in Spanish', () => {
    const result = researchAreaCreateSchema.safeParse({
      content: {
        es: { title: ' ', description: 'Estudia.' },
        en: { title: 'Geomagnetism', description: '' },
      },
      src: '/images/research/area.jpg',
    })

    expect(issues(result)).toEqual([
      { path: 'content.es.title', message: 'El título en español es obligatorio.' },
      { path: 'content.en.description', message: 'La descripción en inglés es obligatoria.' },
    ])
  })

  test('requires a missing language as a whole', () => {
    const result = researchAreaCreateSchema.safeParse({
      content: { es: content.es },
      src: '/images/research/area.jpg',
    })

    expect(issues(result).map((issue) => issue.path)).toEqual(['content.en'])
  })

  test('requires the photo', () => {
    expect(issues(researchAreaCreateSchema.safeParse({ content, src: '  ' }))).toEqual([
      { path: 'src', message: 'La imagen es obligatoria.' },
    ])
    expect(issues(researchAreaCreateSchema.safeParse({ content }))).toEqual([
      { path: 'src', message: 'La imagen debe ser la dirección de un archivo subido.' },
    ])
  })

  test('rejects unknown keys, such as the old single-language title', () => {
    const result = researchAreaCreateSchema.safeParse({
      content,
      src: '/images/research/area.jpg',
      title: 'Geomagnetismo',
    })

    expect(result.success).toBe(false)
  })
})

describe('researchAreaUpdateSchema', () => {
  test('accepts a photo-only update, without touching the text', () => {
    expect(researchAreaUpdateSchema.parse({ version: VERSION, src: '/nueva.jpg' })).toEqual({
      version: VERSION,
      src: '/nueva.jpg',
    })
  })

  test('accepts the text in every language with confirmations', () => {
    const result = researchAreaUpdateSchema.parse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(result.confirmedUnchanged).toEqual([{ locale: 'en', field: 'title' }])
  })

  test('requires the version the editor loaded', () => {
    expect(issues(researchAreaUpdateSchema.safeParse({ src: '/nueva.jpg' }))).toEqual([
      {
        path: 'version',
        message: 'La versión del área de investigación es obligatoria y debe ser la que se cargó.',
      },
    ])
  })

  test('refuses a request with nothing to update', () => {
    expect(issues(researchAreaUpdateSchema.safeParse({ version: VERSION }))).toEqual([
      { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
    ])
  })

  test('refuses confirmations without content', () => {
    const result = researchAreaUpdateSchema.safeParse({
      version: VERSION,
      src: '/nueva.jpg',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(issues(result)).toEqual([
      {
        path: 'confirmedUnchanged',
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      },
    ])
  })
})

describe('researchAreaSrcSchema', () => {
  test('speaks the language of the messages it is built with', () => {
    const result = researchAreaSrcSchema(en.researchAreas.validation).safeParse('')

    expect(result.error?.issues[0]?.message).toBe('The image is required.')
  })
})
