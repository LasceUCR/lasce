import { describe, expect, test } from 'vitest'

import {
  buildSectionRequest,
  sectionHasChanges,
  sectionInitial,
} from './space-weather-section-form'

const VERSION = '2026-10-16T12:00:00.000Z'

const editing = {
  content: {
    es: { title: '¿Por qué estudiarlo desde Costa Rica?', body: 'Primero.\n\nSegundo.' },
    en: { title: 'Why study it from Costa Rica?', body: 'First.\n\nSecond.' },
  },
  isLegacy: false,
  version: VERSION,
}

describe('sectionInitial', () => {
  test('opens with the stored text in every language and the version to save against', () => {
    const initial = sectionInitial(editing)

    expect(initial.draft).toEqual(editing.content)
    expect(initial.version).toBe(VERSION)
    expect(initial.isLegacy).toBe(false)
  })

  test('opens a legacy section with an empty English tab rather than a copy of the Spanish', () => {
    const initial = sectionInitial({
      ...editing,
      content: { es: editing.content.es, en: null },
      isLegacy: true,
    })

    expect(initial.draft.en).toEqual({ title: '', body: '' })
    expect(initial.isLegacy).toBe(true)
  })
})

describe('sectionHasChanges', () => {
  test('ignores spaces around the text, which the save trims', () => {
    const initial = sectionInitial(editing)
    const draft = {
      ...initial.draft,
      en: { ...initial.draft.en, title: '  Why study it from Costa Rica?  ' },
    }

    expect(sectionHasChanges(initial, draft)).toBe(false)
  })

  test('notices a change in either language', () => {
    const initial = sectionInitial(editing)
    const draft = { ...initial.draft, en: { ...initial.draft.en, body: 'Changed.' } }

    expect(sectionHasChanges(initial, draft)).toBe(true)
  })
})

describe('buildSectionRequest', () => {
  test('is null when nothing changed', () => {
    const initial = sectionInitial(editing)

    expect(buildSectionRequest(initial, initial.draft, [])).toBeNull()
  })

  test('sends both languages trimmed, the version and only the confirmations still needed', () => {
    const initial = sectionInitial(editing)
    const draft = { ...initial.draft, es: { ...initial.draft.es, body: ' Nuevo texto. ' } }

    expect(
      buildSectionRequest(initial, draft, [
        { locale: 'en', field: 'body' },
        { locale: 'en', field: 'title' },
      ]),
    ).toEqual({
      version: VERSION,
      content: {
        es: { title: '¿Por qué estudiarlo desde Costa Rica?', body: 'Nuevo texto.' },
        en: { title: 'Why study it from Costa Rica?', body: 'First.\n\nSecond.' },
      },
      confirmedUnchanged: [{ locale: 'en', field: 'body' }],
    })
  })

  test('leaves confirmations out when both languages changed together', () => {
    const initial = sectionInitial(editing)
    const draft = {
      es: { ...initial.draft.es, title: 'Nuevo título' },
      en: { ...initial.draft.en, title: 'New title' },
    }

    expect(buildSectionRequest(initial, draft, [])).not.toHaveProperty('confirmedUnchanged')
  })
})
