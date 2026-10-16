import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }

import {
  buildUpdateRequest,
  describeSaveFailure,
  editorLanguage,
  hasContentChanges,
  hasUnsavedChanges,
  initialFromSection,
  isFormField,
  reviewsNeeded,
  validateDraft,
  type SectionFormInitial,
} from './solar-physics-section-form'
import type { SolarPhysicsSection } from './solar-physics-section-schema'

const VERSION = '2026-09-01T10:00:00.000Z'

const bilingual: SolarPhysicsSection = {
  title: 'Trabajo de LASCE',
  paragraphs: ['Uno.', 'Dos.'],
  contentLocale: 'es',
  editing: {
    content: {
      es: { title: 'Trabajo de LASCE', body: 'Uno.\n\nDos.' },
      en: { title: 'LASCE work', body: 'One.\n\nTwo.' },
    },
    isLegacy: false,
    version: VERSION,
  },
}

const legacy: SolarPhysicsSection = {
  ...bilingual,
  contentLocale: null,
  editing: {
    content: { es: { title: 'Base title', body: 'Base text.' }, en: null },
    isLegacy: true,
    version: VERSION,
  },
}

function open(section: SolarPhysicsSection): SectionFormInitial {
  const initial = initialFromSection(section)
  if (!initial) throw new Error('The section carries no editing data.')
  return initial
}

const english = editorLanguage('en', en.solarPhysics.saveErrors)

describe('initialFromSection', () => {
  test('opens every language with its own stored text and the version to save against', () => {
    const initial = open(bilingual)

    expect(initial.draft).toEqual({
      es: { title: 'Trabajo de LASCE', body: 'Uno.\n\nDos.' },
      en: { title: 'LASCE work', body: 'One.\n\nTwo.' },
    })
    expect(initial).toMatchObject({ isLegacy: false, version: VERSION })
  })

  test('opens a legacy section with its base text in Spanish and an empty English tab', () => {
    const initial = open(legacy)

    expect(initial.draft.es).toEqual({ title: 'Base title', body: 'Base text.' })
    expect(initial.draft.en).toEqual({ title: '', body: '' })
    expect(initial.isLegacy).toBe(true)
  })

  test('has nothing to edit without editing data', () => {
    const { editing: _editing, ...visitorView } = bilingual

    expect(initialFromSection(visitorView)).toBeNull()
  })
})

describe('change detection', () => {
  test('sees no change in a form that was only opened', () => {
    const initial = open(bilingual)

    expect(hasContentChanges(initial, initial.draft)).toBe(false)
    expect(hasUnsavedChanges(initial, initial.draft)).toBe(false)
  })

  test('counts anything typed as unsaved, even a space', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, en: { ...initial.draft.en, title: 'LASCE work ' } }

    expect(hasUnsavedChanges(initial, draft)).toBe(true)
    expect(hasContentChanges(initial, draft)).toBe(false)
  })

  test('needs a review of the other language when only one changed', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, es: { ...initial.draft.es, body: 'Otro texto.' } }

    expect(reviewsNeeded(initial, draft)).toEqual([{ locale: 'en', field: 'body' }])
  })
})

describe('validateDraft', () => {
  test('accepts an unchanged form', () => {
    const initial = open(bilingual)

    expect(validateDraft(initial, initial.draft, [])).toEqual({})
  })

  test('reports an empty text under its field, in Spanish by default', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, es: { ...initial.draft.es, body: '  ' } }

    expect(validateDraft(initial, draft, [])).toMatchObject({
      'content.es.body': 'El texto en español es obligatorio.',
    })
  })

  test('reports it in the editor language when that is English', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, es: { ...initial.draft.es, body: '  ' } }

    expect(validateDraft(initial, draft, [], english)).toMatchObject({
      'content.es.body': 'The Spanish text is required.',
    })
  })

  test('flags a one-sided change until it is confirmed', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, es: { ...initial.draft.es, title: 'Nuevo título' } }

    expect(validateDraft(initial, draft, [])).toHaveProperty('content.en.title')
    expect(validateDraft(initial, draft, [{ locale: 'en', field: 'title' }])).toEqual({})
  })
})

describe('buildUpdateRequest', () => {
  test('sends nothing when nothing changed', () => {
    const initial = open(bilingual)

    expect(buildUpdateRequest(initial, initial.draft, [])).toBeNull()
  })

  test('sends the content in both languages, trimmed, with the version', () => {
    const initial = open(bilingual)
    const draft = {
      es: { title: '  Nuevo  ', body: 'Texto nuevo.' },
      en: { title: ' New ', body: 'New text.' },
    }

    expect(buildUpdateRequest(initial, draft, [])).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Nuevo', body: 'Texto nuevo.' },
        en: { title: 'New', body: 'New text.' },
      },
    })
  })

  test('sends only the confirmations this edit still needs', () => {
    const initial = open(bilingual)
    const draft = { ...initial.draft, es: { ...initial.draft.es, title: 'Nuevo título' } }

    const body = buildUpdateRequest(initial, draft, [
      { locale: 'en', field: 'title' },
      { locale: 'en', field: 'body' },
    ])

    expect(body?.confirmedUnchanged).toEqual([{ locale: 'en', field: 'title' }])
  })
})

describe('isFormField', () => {
  test('knows the title and text of each language and nothing else', () => {
    expect(isFormField('content.en.title')).toBe(true)
    expect(isFormField('content.es.body')).toBe(true)
    expect(isFormField('version')).toBe(false)
    expect(isFormField('content.fr.title')).toBe(false)
  })
})

describe('describeSaveFailure', () => {
  test('shows each rejected field under it, with the server text in Spanish', () => {
    const failure = describeSaveFailure(400, {
      code: 'invalid-body',
      error: 'Revise',
      issues: [{ path: 'content.en.title', message: 'El título en inglés es obligatorio.' }],
    })

    expect(failure).toEqual({
      message: 'Revise los campos marcados.',
      fieldErrors: { 'content.en.title': 'El título en inglés es obligatorio.' },
      reopen: false,
    })
  })

  test('uses the editor language instead of the server text when it is English', () => {
    const failure = describeSaveFailure(
      400,
      {
        code: 'invalid-body',
        issues: [{ path: 'content.en.title', message: 'El título en inglés es obligatorio.' }],
      },
      english,
    )

    expect(failure.message).toBe('Check the highlighted fields.')
    expect(failure.fieldErrors['content.en.title']).toBe('Check the highlighted fields.')
  })

  test('puts the review message under every field still to update or confirm', () => {
    const failure = describeSaveFailure(400, {
      code: 'review-required',
      pending: [{ path: 'content.en.body', locale: 'en', field: 'body' }],
    })

    expect(Object.keys(failure.fieldErrors)).toEqual(['content.en.body'])
    expect(failure.reopen).toBe(false)
  })

  test('asks to reload after a conflict', () => {
    const failure = describeSaveFailure(409, { code: 'conflict' })

    expect(failure).toMatchObject({ reopen: true, fieldErrors: {} })
    expect(failure.message).toContain('Otra persona guardó cambios en esta sección')
  })

  test('asks to reload when the section no longer exists', () => {
    const failure = describeSaveFailure(404, { code: 'not-found' })

    expect(failure).toMatchObject({ reopen: true })
    expect(failure.message).toBe('Esta sección ya no existe. Sus cambios no se guardaron.')
  })

  test('explains a missing session and missing permission, keeping the form', () => {
    expect(describeSaveFailure(401, null).message).toContain('No ha iniciado sesión.')
    expect(describeSaveFailure(403, null).message).toBe(
      'No tiene permisos para modificar este contenido.',
    )
  })

  test('falls back to a generic message for anything else', () => {
    expect(describeSaveFailure(500, { code: 'internal-error' }).message).toBe(
      'No se pudo guardar el cambio. Inténtelo de nuevo.',
    )
    expect(describeSaveFailure(500, null, english).message).toBe(
      'The change could not be saved. Please try again.',
    )
  })
})
