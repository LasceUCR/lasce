import { describe, expect, test } from 'vitest'

import { collaborationsContent, getCollaborationsContent } from './collaborations'
import { getMessages } from './i18n/messages'
import { getResearchCollaborations, researchCollaborations } from './research-collaborations'

describe('collaborations content', () => {
  test('is Spanish by default, with the ISWI and IVIA initiatives', () => {
    expect(collaborationsContent.hero.title).toBe('Colaboraciones e Iniciativas')
    expect(collaborationsContent.initiatives.items.map((item) => item.id)).toEqual(['iswi', 'ivia'])
    expect(collaborationsContent.initiatives.items.map((item) => item.paragraphs.length)).toEqual([
      1, 5,
    ])
  })

  test('follows the catalogue it is given and keeps links and logos', () => {
    const english = getCollaborationsContent(getMessages('en'))

    expect(english.initiatives.items[0]?.title).toBe(
      'International Space Weather Initiative (ISWI)',
    )
    expect(english.initiatives.items.map(({ href, logo }) => ({ href, src: logo?.src }))).toEqual(
      collaborationsContent.initiatives.items.map(({ href, logo }) => ({ href, src: logo?.src })),
    )
  })
})

describe('research collaborations', () => {
  test('names countries in Spanish by default', () => {
    expect(researchCollaborations.find((item) => item.id === 'ingv')?.country).toBe('Italia')
    expect(researchCollaborations).toHaveLength(8)
  })

  test('names countries in the language it is given and keeps organization names', () => {
    const english = getResearchCollaborations(getMessages('en').collaborations.countries)

    expect(english.find((item) => item.id === 'opm')?.country).toBe('France')
    expect(english.map((item) => item.name)).toEqual(
      researchCollaborations.map((item) => item.name),
    )
  })
})
