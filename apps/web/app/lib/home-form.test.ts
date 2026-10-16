import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }

import {
  buildHeroRequest,
  buildIndicatorRequest,
  heroInitial,
  homeEditorLanguage,
  indicatorHasChanges,
  indicatorInitial,
  jsonRequest,
  moveIndicator,
  validateIndicatorValue,
} from './home-form'

const VERSION = '2026-10-14T10:00:00.000Z'

const ENGLISH = homeEditorLanguage('en', en.home)

const heroEditing = {
  content: {
    es: { title: 'Exploramos el Sol', lead: 'Investigamos.' },
    en: { title: 'We explore the Sun', lead: 'We study.' },
  },
  isLegacy: false,
  version: VERSION,
}

const indicatorEditing = {
  content: { es: { description: 'Estable' }, en: { description: 'Stable' } },
  isLegacy: false,
  value: '-12 nT',
  version: VERSION,
}

describe('homeEditorLanguage', () => {
  test('falls back to Spanish for a language the site does not have', () => {
    expect(homeEditorLanguage('fr', en.home).uiLocale).toBe('es')
  })
})

describe('buildHeroRequest', () => {
  test('is null when nothing changed', () => {
    const initial = heroInitial(heroEditing)

    expect(buildHeroRequest(initial, initial.draft, [])).toBeNull()
  })

  test('sends both languages trimmed, the version and only the confirmations still needed', () => {
    const initial = heroInitial(heroEditing)
    const draft = { ...initial.draft, es: { ...initial.draft.es, lead: ' Nuevo subtítulo. ' } }

    expect(
      buildHeroRequest(initial, draft, [
        { locale: 'en', field: 'lead' },
        { locale: 'en', field: 'title' },
      ]),
    ).toEqual({
      version: VERSION,
      content: {
        es: { title: 'Exploramos el Sol', lead: 'Nuevo subtítulo.' },
        en: { title: 'We explore the Sun', lead: 'We study.' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'lead' }],
    })
  })
})

describe('buildIndicatorRequest', () => {
  test('sends only the value when only the value changed', () => {
    const initial = indicatorInitial(indicatorEditing)

    expect(buildIndicatorRequest(initial, { ...initial.draft, value: ' -40 nT ' }, [])).toEqual({
      version: VERSION,
      value: '-40 nT',
    })
  })

  test('sends the description in every language when it changed in one', () => {
    const initial = indicatorInitial(indicatorEditing)
    const draft = {
      ...initial.draft,
      content: { es: { description: 'Perturbado' }, en: { description: 'Disturbed' } },
    }

    expect(buildIndicatorRequest(initial, draft, [])).toEqual({
      version: VERSION,
      content: { es: { description: 'Perturbado' }, en: { description: 'Disturbed' } },
    })
  })

  test('is null when nothing changed', () => {
    const initial = indicatorInitial(indicatorEditing)

    expect(buildIndicatorRequest(initial, initial.draft, [])).toBeNull()
    expect(indicatorHasChanges(initial, initial.draft)).toBe(false)
    expect(indicatorHasChanges(initial, { ...initial.draft, value: '-12 nT ' })).toBe(false)
  })
})

describe('validateIndicatorValue', () => {
  test('applies the API rule in the editor language', () => {
    expect(validateIndicatorValue('-12 nT')).toBeNull()
    expect(validateIndicatorValue('1234567890123456')).toBe(
      'El valor no puede superar los 15 caracteres.',
    )
    expect(validateIndicatorValue('', ENGLISH)).toBe('The value is required.')
  })
})

describe('moveIndicator', () => {
  test('moves the dragged id to where it was dropped', () => {
    expect(moveIndicator(['kp', 'dst', 'ae', 'ap'], 'kp', 'ae')).toEqual(['dst', 'ae', 'kp', 'ap'])
    expect(moveIndicator(['kp', 'dst', 'ae', 'ap'], 'ap', 'kp')).toEqual(['ap', 'kp', 'dst', 'ae'])
  })

  test('leaves the order as it was for a drop in place, outside, or of an unknown id', () => {
    const ids = ['kp', 'dst']

    expect(moveIndicator(ids, 'kp', 'kp')).toEqual(ids)
    expect(moveIndicator(ids, 'kp', null)).toEqual(ids)
    expect(moveIndicator(ids, 'bz', 'kp')).toEqual(ids)
  })
})

describe('jsonRequest', () => {
  test('sends the body as JSON with its method', () => {
    expect(jsonRequest('PUT', { ids: ['a'] })).toEqual({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"ids":["a"]}',
    })
  })
})
