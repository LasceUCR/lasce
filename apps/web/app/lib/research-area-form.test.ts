import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }

import {
  buildCreateRequest,
  buildUpdateRequest,
  emptyInitial,
  hasUnsavedText,
  initialFromArea,
  researchAreaEditorLanguage,
  reviewsNeededFor,
  validateDraft,
} from './research-area-form'
import type { ResearchArea } from './research-area-schema'

const VERSION = '2026-10-15T10:00:00.000Z'

const spanish = { title: 'Geomagnetismo', description: 'Estudia el campo magnético.' }
const english = { title: 'Geomagnetism', description: 'Studies the magnetic field.' }

const bilingual: ResearchArea = {
  id: 'area-1',
  ...spanish,
  src: '/area.jpg',
  editing: { content: { es: spanish, en: english }, isLegacy: false, version: VERSION },
}

const legacy: ResearchArea = {
  ...bilingual,
  editing: { content: { es: spanish, en: null }, isLegacy: true, version: VERSION },
}

const ENGLISH = researchAreaEditorLanguage('en', en.researchAreas.validation)

describe('initial state', () => {
  test('a new area starts empty in every language, without a photo or a version', () => {
    expect(emptyInitial()).toEqual({
      draft: {
        es: { title: '', description: '' },
        en: { title: '', description: '' },
      },
      src: '',
      stored: null,
      isLegacy: false,
      version: null,
    })
  })

  test('an existing area opens with each language from its own stored text', () => {
    const initial = initialFromArea(bilingual)

    expect(initial.draft).toEqual({ es: spanish, en: english })
    expect(initial.version).toBe(VERSION)
    expect(initial.src).toBe('/area.jpg')
  })

  test('a legacy area opens with an empty English tab, nothing copied across', () => {
    const initial = initialFromArea(legacy)

    expect(initial.draft.en).toEqual({ title: '', description: '' })
    expect(initial.isLegacy).toBe(true)
  })

  test('an area without editing data is treated as base text with no translation', () => {
    const { editing: _editing, ...shown } = bilingual
    const initial = initialFromArea(shown)

    expect(initial.stored).toEqual({ es: spanish, en: null })
    expect(initial.version).toBeNull()
  })

  test('falls back to Spanish for a language the site does not have', () => {
    expect(researchAreaEditorLanguage('fr', en.researchAreas.validation).uiLocale).toBe('es')
  })
})

describe('hasUnsavedText', () => {
  test('counts anything typed, even a space', () => {
    const initial = initialFromArea(bilingual)

    expect(hasUnsavedText(initial, initial.draft)).toBe(false)
    expect(
      hasUnsavedText(initial, { ...initial.draft, en: { ...english, title: `${english.title} ` } }),
    ).toBe(true)
  })
})

describe('validateDraft', () => {
  test('requires both languages and the photo when creating, in the editor language', () => {
    const initial = emptyInitial()

    expect(validateDraft(initial, initial.draft, [], '', ENGLISH)).toEqual({
      'content.es.title': 'The Spanish title is required.',
      'content.es.description': 'The Spanish description is required.',
      'content.en.title': 'The English title is required.',
      'content.en.description': 'The English description is required.',
      src: 'The image is required.',
    })
  })

  test('lets a legacy area get a new photo without translating it', () => {
    const initial = initialFromArea(legacy)

    expect(validateDraft(initial, initial.draft, [], '/nueva.jpg')).toEqual({})
  })

  test('asks to review the counterpart of a field changed in one language only', () => {
    const initial = initialFromArea(bilingual)
    const draft = { ...initial.draft, es: { ...spanish, title: 'Geomagnetismo regional' } }

    expect(reviewsNeededFor(initial, draft)).toEqual([{ locale: 'en', field: 'title' }])
    expect(Object.keys(validateDraft(initial, draft, [], '/area.jpg'))).toEqual([
      'content.en.title',
    ])
    expect(validateDraft(initial, draft, [{ locale: 'en', field: 'title' }], '/area.jpg')).toEqual(
      {},
    )
  })
})

describe('request bodies', () => {
  test('create sends both languages trimmed and the photo', () => {
    expect(
      buildCreateRequest(
        { es: { title: ' Geomagnetismo ', description: spanish.description }, en: english },
        '/area.jpg',
      ),
    ).toEqual({ content: { es: spanish, en: english }, src: '/area.jpg' })
  })

  test('an update is null when nothing changed', () => {
    const initial = initialFromArea(bilingual)

    expect(buildUpdateRequest(initial, initial.draft, [], '/area.jpg')).toBeNull()
  })

  test('a photo-only update sends the version and the new photo, not the text', () => {
    const initial = initialFromArea(legacy)

    expect(buildUpdateRequest(initial, initial.draft, [], '/nueva.jpg')).toEqual({
      version: VERSION,
      src: '/nueva.jpg',
    })
  })

  test('a text update sends every language with only the confirmations still needed', () => {
    const initial = initialFromArea(bilingual)
    const draft = { ...initial.draft, es: { ...spanish, title: 'Geomagnetismo regional' } }

    expect(
      buildUpdateRequest(
        initial,
        draft,
        [
          { locale: 'en', field: 'title' },
          { locale: 'en', field: 'description' },
        ],
        '/area.jpg',
      ),
    ).toEqual({
      version: VERSION,
      content: { es: { ...spanish, title: 'Geomagnetismo regional' }, en: english },
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })
  })
})
