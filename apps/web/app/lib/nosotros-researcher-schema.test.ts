import { describe, expect, test } from 'vitest'

import {
  getNosotrosResearcherCreateSchema,
  getNosotrosResearcherUpdateSchema,
  nosotrosResearcherContent,
  nosotrosResearcherCreateSchema,
  nosotrosResearcherUpdateSchema,
} from './nosotros-researcher-schema'

/**
 * The contract of a researcher's bilingual content: the fields, the messages and paths the API
 * forwards to the editor, and the shape of a create and an update body.
 */

const content = {
  es: { role: 'Investigadora', description: 'Estudia el clima espacial.' },
  en: { role: 'Researcher', description: 'Studies space weather.' },
}

const shared = {
  src: '/images/Researchers/Someone.jpg',
  name: 'Dra. Ada Lovelace',
  institution: 'Universidad de Costa Rica',
}

const VERSION = '2026-01-01T00:00:00.000Z'

function issuesOf(result: { success: boolean; error?: { issues: unknown[] } }) {
  return (result.error?.issues ?? []) as { path: PropertyKey[]; message: string }[]
}

describe('nosotrosResearcherContent', () => {
  test('translates the role and the description', () => {
    expect(nosotrosResearcherContent.fields).toEqual(['role', 'description'])
  })
})

describe('nosotrosResearcherCreateSchema', () => {
  test('accepts both languages in full with the shared fields, trimming the text', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      content: {
        ...content,
        es: { role: '  Investigadora ', description: ' Estudia el clima espacial. ' },
      },
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ ...shared, content })
  })

  test('accepts a researcher without a description in either language', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      content: {
        es: { role: 'Investigadora', description: null },
        en: { role: 'Researcher', description: '' },
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content.es.description).toBeNull()
      expect(result.data.content.en.description).toBeNull()
    }
  })

  test('requires the English role, naming the language and the field', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      content: {
        es: content.es,
        en: { role: '  ', description: content.en.description },
      },
    })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['content', 'en', 'role'],
        message: 'El rol en inglés es obligatorio.',
      }),
    ])
  })

  test('requires the description in the other language once one is filled in', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      content: { es: content.es, en: { role: 'Researcher', description: null } },
    })

    expect(result.success).toBe(false)
    expect(issuesOf(result)).toEqual([
      expect.objectContaining({ path: ['content', 'en', 'description'] }),
    ])
  })

  test('requires the shared fields', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      src: '',
      name: ' ',
      institution: '',
      content,
    })

    expect(issuesOf(result).map((issue) => issue.message)).toEqual([
      'El nombre es obligatorio.',
      'La institución es obligatoria.',
    ])
  })

  test('accepts a researcher with no photo, which is optional', () => {
    const { src: _src, ...withoutPhoto } = shared

    expect(nosotrosResearcherCreateSchema.safeParse({ ...withoutPhoto, content }).success).toBe(
      true,
    )
    expect(nosotrosResearcherCreateSchema.safeParse({ ...shared, src: '', content }).success).toBe(
      true,
    )
  })

  test('splits a comma-separated list of addresses into an array', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      email: 'a@ucr.ac.cr, b@ucr.ac.cr',
      content,
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toEqual(['a@ucr.ac.cr', 'b@ucr.ac.cr'])
  })

  test('treats an empty address list as no addresses', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({ ...shared, email: '', content })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toEqual([])
  })

  test('rejects a malformed address', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      email: 'not-an-email',
      content,
    })

    expect(issuesOf(result).map((issue) => issue.message)).toContain(
      'Uno o más correos no son válidos.',
    )
  })

  test('rejects more than two addresses', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      email: 'a@ucr.ac.cr, b@ucr.ac.cr, c@ucr.ac.cr',
      content,
    })

    expect(issuesOf(result).map((issue) => issue.message)).toContain(
      'Máximo 2 correos de contacto.',
    )
  })

  test('rejects a body that carries the old flat fields', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      role: 'Investigadora',
      description: 'Estudia el clima espacial.',
    })

    expect(result.success).toBe(false)
  })

  test('rejects an unsupported language', () => {
    const result = nosotrosResearcherCreateSchema.safeParse({
      ...shared,
      content: { ...content, fr: content.en },
    })

    expect(result.success).toBe(false)
  })
})

describe('nosotrosResearcherUpdateSchema', () => {
  test('accepts a content update with its version', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({ version: VERSION, content })

    expect(result.success).toBe(true)
  })

  test('accepts a shared-fields-only update, without content', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({
      version: VERSION,
      institution: 'Universidad Nacional',
    })

    expect(result.success).toBe(true)
  })

  test('accepts clearing the addresses', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({ version: VERSION, email: '' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toEqual([])
  })

  test('accepts confirmations along with content', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({
      version: VERSION,
      content,
      confirmedUnchanged: [{ locale: 'en', field: 'role' }],
    })

    expect(result.success).toBe(true)
  })

  test('requires the version', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({ name: 'Dra. Ada Lovelace' })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['version'],
        message: 'La versión del investigador es obligatoria y debe ser la que se cargó.',
      }),
    ])
  })

  test('rejects confirmations without content', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({
      version: VERSION,
      name: 'Dra. Ada Lovelace',
      confirmedUnchanged: [{ locale: 'en', field: 'role' }],
    })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      }),
    ])
  })

  test('rejects a request with nothing to update', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({ version: VERSION })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      }),
    ])
  })

  test('rejects an empty shared field that is present', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({ version: VERSION, name: '  ' })

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({ path: ['name'], message: 'El nombre es obligatorio.' }),
    ])
  })

  test('rejects a content update that leaves a language incomplete', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({
      version: VERSION,
      content: { es: content.es },
    })

    expect(result.success).toBe(false)
  })

  test('rejects unknown keys', () => {
    const result = nosotrosResearcherUpdateSchema.safeParse({
      version: VERSION,
      name: 'Dra. Ada Lovelace',
      role: 'Investigadora',
    })

    expect(result.success).toBe(false)
  })

  test('validates in English with getNosotrosResearcherCreateSchema and getNosotrosResearcherUpdateSchema', () => {
    const enCreateSchema = getNosotrosResearcherCreateSchema('en')
    const createResult = enCreateSchema.safeParse({
      name: '',
      institution: '',
      content,
    })
    expect(createResult.success).toBe(false)
    expect(issuesOf(createResult)).toEqual([
      expect.objectContaining({ path: ['name'], message: 'Name is required.' }),
      expect.objectContaining({ path: ['institution'], message: 'Institution is required.' }),
    ])

    const enUpdateSchema = getNosotrosResearcherUpdateSchema('en')
    const updateResult = enUpdateSchema.safeParse({ version: VERSION })
    expect(updateResult.success).toBe(false)
    expect(issuesOf(updateResult)).toEqual([
      expect.objectContaining({
        path: [],
        message: 'The request does not include any fields to update.',
      }),
    ])
  })
})
