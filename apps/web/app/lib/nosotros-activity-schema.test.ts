import { describe, expect, test } from 'vitest'

import {
  nosotrosActivityContent,
  nosotrosActivityCreateSchema,
  nosotrosActivityUpdateSchema,
} from './nosotros-activity-schema'

/**
 * The contract of a "¿Qué hacemos?" card's bilingual content: the fields, the messages and paths
 * the API forwards to the editor, and the shape of a create and an update body.
 */

const content = {
  es: { title: 'Título', description: 'Descripción.' },
  en: { title: 'Title', description: 'Description.' },
}

const VERSION = '2026-01-01T00:00:00.000Z'

function issuesOf(result: { success: boolean; error?: { issues: unknown[] } }) {
  return (result.error?.issues ?? []) as { path: PropertyKey[]; message: string }[]
}

describe('nosotrosActivityContent', () => {
  test('translates the title and the description', () => {
    expect(nosotrosActivityContent.fields).toEqual(['title', 'description'])
  })
})

describe('nosotrosActivityCreateSchema', () => {
  test('accepts an icon with both languages in full, trimming the text', () => {
    const result = nosotrosActivityCreateSchema.safeParse({
      icon: 'waves',
      content: { ...content, es: { title: '  Título ', description: ' Descripción. ' } },
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ icon: 'waves', content })
  })

  test('rejects an unknown icon', () => {
    const result = nosotrosActivityCreateSchema.safeParse({ icon: 'moon', content })

    expect(result.success).toBe(false)
    expect(issuesOf(result)).toEqual([
      expect.objectContaining({ path: ['icon'], message: 'Seleccione un ícono válido.' }),
    ])
  })

  test('requires the English text, naming the language and the field', () => {
    const result = nosotrosActivityCreateSchema.safeParse({
      icon: 'sun',
      content: { es: content.es, en: { title: '  ', description: '' } },
    })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['content', 'en', 'title'],
        message: 'El título en inglés es obligatorio.',
      }),
      expect.objectContaining({
        path: ['content', 'en', 'description'],
        message: 'La descripción en inglés es obligatoria.',
      }),
    ])
  })

  test('requires the Spanish text', () => {
    const result = nosotrosActivityCreateSchema.safeParse({
      icon: 'sun',
      content: { es: { title: '', description: 'Descripción.' }, en: content.en },
    })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['content', 'es', 'title'],
        message: 'El título en español es obligatorio.',
      }),
    ])
  })

  test('rejects a body that carries the old flat fields', () => {
    const result = nosotrosActivityCreateSchema.safeParse({
      icon: 'sun',
      title: 'Título',
      description: 'Descripción.',
    })

    expect(result.success).toBe(false)
  })

  test('rejects an unsupported language', () => {
    const result = nosotrosActivityCreateSchema.safeParse({
      icon: 'sun',
      content: { ...content, fr: content.en },
    })

    expect(result.success).toBe(false)
  })
})

describe('nosotrosActivityUpdateSchema', () => {
  test('accepts a content update with its version', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({ version: VERSION, content })

    expect(result.success).toBe(true)
  })

  test('accepts an icon-only update, without content', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({ version: VERSION, icon: 'code' })

    expect(result.success).toBe(true)
  })

  test('accepts confirmations along with content', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(result.success).toBe(true)
  })

  test('requires the version', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({ icon: 'code' })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['version'],
        message: 'La versión de la actividad es obligatoria y debe ser la que se cargó.',
      }),
    ])
  })

  test('rejects confirmations without content', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({
      version: VERSION,
      icon: 'code',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      }),
    ])
  })

  test('rejects a request with nothing to update', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({ version: VERSION })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      }),
    ])
  })

  test('rejects a content update that leaves a language incomplete', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({
      version: VERSION,
      content: { es: content.es },
    })

    expect(result.success).toBe(false)
  })

  test('rejects unknown keys', () => {
    const result = nosotrosActivityUpdateSchema.safeParse({
      version: VERSION,
      icon: 'code',
      title: 'Título',
    })

    expect(result.success).toBe(false)
  })
})
