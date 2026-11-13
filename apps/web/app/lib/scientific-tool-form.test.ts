import { describe, expect, test } from 'vitest'

import es from '@/messages/es.json'
import { Edit, Legacy } from '@/app/components/public/scientific-tools/ScientificToolForm.stories'
import {
  scientificToolDraft,
  scientificToolRequest,
  validateScientificToolDraft,
} from './scientific-tool-form'

const tool = Edit.args!.tool!
const messages = es.scientificTools.validation

describe('scientific tool drafts', () => {
  test('starts empty for a new tool and loads every stored language for an edit', () => {
    expect(scientificToolDraft()).toEqual({
      name: '',
      accessUrl: '',
      imageUrl: '',
      content: { es: { description: '' }, en: { description: '' } },
    })
    expect(scientificToolDraft(tool)).toMatchObject({
      name: 'SWAAT',
      accessUrl: tool.href,
      content: { en: { description: 'Analysis of solar events.' } },
    })
    expect(scientificToolDraft(Legacy.args!.tool!).content.en.description).toBe('')
  })

  test('sends every field on create', () => {
    const draft = {
      ...scientificToolDraft(),
      name: ' SOLAR ',
      accessUrl: 'https://solar.test',
      content: { es: { description: 'Uno.' }, en: { description: 'One.' } },
    }
    expect(scientificToolRequest(undefined, scientificToolDraft(), draft, [])).toEqual({
      name: 'SOLAR',
      accessUrl: 'https://solar.test',
      imageUrl: '',
      content: { es: { description: 'Uno.' }, en: { description: 'One.' } },
    })
  })

  test('sends only what changed on edit, with the version and confirmations', () => {
    const initial = scientificToolDraft(tool)
    expect(scientificToolRequest(tool, initial, initial, [])).toBeNull()
    expect(scientificToolRequest(tool, initial, { ...initial, imageUrl: '' }, [])).toEqual({
      imageUrl: '',
      version: tool.editing!.version,
    })
    const confirmed = [{ locale: 'en' as const, field: 'description' as const }]
    const changed = {
      ...initial,
      content: { ...initial.content, es: { description: 'Nuevo.' } },
    }
    expect(scientificToolRequest(tool, initial, changed, confirmed)).toEqual({
      content: { es: { description: 'Nuevo.' }, en: { description: 'Analysis of solar events.' } },
      confirmedUnchanged: confirmed,
      version: tool.editing!.version,
    })
  })

  test('checks new values of the shared fields but not untouched stored ones', () => {
    const initial = scientificToolDraft(tool)
    expect(validateScientificToolDraft(tool, initial, [], 'es', messages)).toEqual({})
    expect(
      validateScientificToolDraft(tool, { ...initial, accessUrl: 'ftp://x' }, [], 'es', messages),
    ).toEqual({ accessUrl: messages.accessUrl })
    expect(
      validateScientificToolDraft(undefined, scientificToolDraft(), [], 'es', messages),
    ).toMatchObject({
      name: messages.name,
      accessUrl: messages.accessUrl,
      'content.es.description': expect.any(String),
      'content.en.description': expect.any(String),
    })
  })
})
