import { describe, expect, test } from 'vitest'

import {
  rosacAcknowledgmentContent,
  rosacAcknowledgmentCreateSchema,
  rosacAcknowledgmentUpdateSchema,
  rosacActivityContent,
  rosacActivityUpdateSchema,
  rosacCardIcons,
  rosacCharacteristicContent,
  rosacCharacteristicUpdateSchema,
  rosacInstrumentContent,
  rosacInstrumentCreateSchema,
  rosacInstrumentUpdateSchema,
  rosacResearcherContent,
  rosacResearcherCreateSchema,
  rosacResearcherUpdateSchema,
  rosacStageContent,
  rosacStageUpdateSchema,
} from './rosac-schema'

const textPair = {
  es: { title: 'Título', description: 'Descripción.' },
  en: { title: 'Title', description: 'Description.' },
}

const VERSION = '2026-01-01T00:00:00.000Z'

function issuesOf(result: { success: boolean; error?: { issues: unknown[] } }) {
  return (result.error?.issues ?? []) as { path: PropertyKey[]; message: string }[]
}

describe('rosacCharacteristicContent', () => {
  test('translates the title and the description', () => {
    expect(rosacCharacteristicContent.fields).toEqual(['title', 'description'])
  })

  test('accepts valid update with version and content', () => {
    const result = rosacCharacteristicUpdateSchema.safeParse({
      version: VERSION,
      content: textPair,
      icon: 'antenna',
    })
    expect(result.success).toBe(true)
  })

  test('accepts shared-only icon update without content', () => {
    const result = rosacCharacteristicUpdateSchema.safeParse({
      version: VERSION,
      icon: 'sun',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty update with no fields', () => {
    const result = rosacCharacteristicUpdateSchema.safeParse({
      version: VERSION,
    })
    expect(result.success).toBe(false)
  })
})

describe('rosacActivityContent', () => {
  test('translates title and description', () => {
    expect(rosacActivityContent.fields).toEqual(['title', 'description'])
  })

  test('validates update with version', () => {
    const result = rosacActivityUpdateSchema.safeParse({
      version: VERSION,
      content: textPair,
    })
    expect(result.success).toBe(true)
  })
})

describe('rosacStageContent', () => {
  test('translates title and description', () => {
    expect(rosacStageContent.fields).toEqual(['title', 'description'])
  })

  test('validates update with images', () => {
    const result = rosacStageUpdateSchema.safeParse({
      version: VERSION,
      images: [{ src: '/img.jpg', alt: 'Test' }],
    })
    expect(result.success).toBe(true)
  })
})

describe('rosacInstrumentContent', () => {
  test('translates name and description', () => {
    expect(rosacInstrumentContent.fields).toEqual(['name', 'description'])
  })

  test('validates creation with content and shared fields', () => {
    const result = rosacInstrumentCreateSchema.safeParse({
      content: {
        es: { name: 'Espectrómetro', description: 'Instrumento solar.' },
        en: { name: 'Spectrometer', description: 'Solar instrument.' },
      },
      image: { src: '/inst.jpg', alt: 'Alt' },
      consultation: { label: 'Consultar', href: '/datos' },
    })
    expect(result.success).toBe(true)
  })

  test('requires both languages on create', () => {
    const result = rosacInstrumentCreateSchema.safeParse({
      content: {
        es: { name: 'Espectrómetro', description: 'Instrumento solar.' },
        en: { name: '', description: '' },
      },
    })
    expect(result.success).toBe(false)
    expect(issuesOf(result)).toEqual([
      expect.objectContaining({
        path: ['content', 'en', 'name'],
        message: 'El nombre en inglés es obligatorio.',
      }),
      expect.objectContaining({
        path: ['content', 'en', 'description'],
        message: 'La descripción en inglés es obligatoria.',
      }),
    ])
  })
})

describe('rosacAcknowledgmentContent', () => {
  test('translates name', () => {
    expect(rosacAcknowledgmentContent.fields).toEqual(['name'])
  })

  test('validates create with logo and name in both languages', () => {
    const result = rosacAcknowledgmentCreateSchema.safeParse({
      content: {
        es: { name: 'UCR' },
        en: { name: 'University of Costa Rica' },
      },
      logo: { src: '/logo.png', alt: 'UCR logo' },
      href: 'https://ucr.ac.cr',
    })
    expect(result.success).toBe(true)
  })
})

describe('rosacResearcherContent', () => {
  test('translates role and optional description (all-or-none)', () => {
    expect(rosacResearcherContent.fields).toEqual(['role', 'description'])
  })

  test('validates create with both languages and shared info', () => {
    const result = rosacResearcherCreateSchema.safeParse({
      name: 'Dra. María Pérez',
      institution: 'UCR',
      email: 'maria@ucr.ac.cr',
      content: {
        es: { role: 'Investigadora', description: 'Astrofísica.' },
        en: { role: 'Researcher', description: 'Astrophysics.' },
      },
    })
    expect(result.success).toBe(true)
  })

  test('allows empty description in both languages', () => {
    const result = rosacResearcherCreateSchema.safeParse({
      name: 'Dra. María Pérez',
      institution: 'UCR',
      content: {
        es: { role: 'Investigadora', description: '' },
        en: { role: 'Researcher', description: '' },
      },
    })
    expect(result.success).toBe(true)
  })

  test('rejects description in one language only', () => {
    const result = rosacResearcherCreateSchema.safeParse({
      name: 'Dra. María Pérez',
      institution: 'UCR',
      content: {
        es: { role: 'Investigadora', description: 'Astrofísica.' },
        en: { role: 'Researcher', description: '' },
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('rosacCardIcons', () => {
  test('lists the antenna among the icons a characteristic can use', () => {
    expect(rosacCardIcons).toContain('antenna')
  })
})

describe('update schemas without content changes', () => {
  test('accept a shared-field-only instrument update', () => {
    const result = rosacInstrumentUpdateSchema.safeParse({
      version: VERSION,
      image: { src: '/rosac/antena.jpg', alt: 'Antena' },
    })
    expect(result.success).toBe(true)
  })

  test('reject an instrument update with nothing to change', () => {
    expect(rosacInstrumentUpdateSchema.safeParse({ version: VERSION }).success).toBe(false)
  })

  test('accept a logo-only acknowledgment update', () => {
    const result = rosacAcknowledgmentUpdateSchema.safeParse({
      version: VERSION,
      logo: { src: '/logos/ucr.svg', alt: 'UCR' },
    })
    expect(result.success).toBe(true)
  })

  test('reject acknowledgment confirmations without content', () => {
    const result = rosacAcknowledgmentUpdateSchema.safeParse({
      version: VERSION,
      logo: { src: '/logos/ucr.svg', alt: 'UCR' },
      confirmedUnchanged: [],
    })
    expect(result.success).toBe(false)
  })

  test('accept an institution-only researcher update', () => {
    const result = rosacResearcherUpdateSchema.safeParse({
      version: VERSION,
      institution: 'Universidad Nacional',
    })
    expect(result.success).toBe(true)
  })

  test('reject a researcher update with nothing to change', () => {
    expect(rosacResearcherUpdateSchema.safeParse({ version: VERSION }).success).toBe(false)
  })

  test('reject researcher confirmations without content', () => {
    const result = rosacResearcherUpdateSchema.safeParse({
      version: VERSION,
      name: 'Dra. María Pérez',
      confirmedUnchanged: [],
    })
    expect(result.success).toBe(false)
  })
})
