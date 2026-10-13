import { describe, expect, test } from 'vitest'

import { getMessages } from './i18n/messages'
import {
  getHomeAreaCards,
  getWorkAreaCards,
  isWorkAreaSlug,
  workAreaPath,
  workAreaSlugs,
  workAreas,
} from './work-areas'

describe('work-areas', () => {
  test('builds a public path for each work area slug', () => {
    expect(workAreaPath('clima-espacial')).toBe('/clima-espacial')
  })

  test('accepts only the known work area slugs', () => {
    expect(isWorkAreaSlug('clima-espacial')).toBe(true)
    expect(isWorkAreaSlug('login')).toBe(false)
  })

  test('exposes one card per work area plus the portal access cards', () => {
    const workAreaCards = getWorkAreaCards()
    const homeCards = getHomeAreaCards()

    expect(workAreaCards.map((card) => card.href)).toEqual(workAreaSlugs.map((slug) => `/${slug}`))
    expect(homeCards).toHaveLength(workAreaCards.length + 3)
    expect(homeCards.map((card) => card.href)).toContain('/clima-espacial')
  })

  test('titles the cards in Spanish by default', () => {
    expect(getHomeAreaCards().map((card) => card.title)).toEqual([
      'Física solar',
      'Clima espacial',
      'ROSAC',
      'Herramientas científicas',
      'Datos y análisis',
      'Divulgación',
    ])
    expect(workAreas['clima-espacial'].description).toBe('Fenómenos solares y sus efectos')
  })

  test('titles the cards in the language of the catalogue it is given', () => {
    const cards = getHomeAreaCards(getMessages('en').workAreas)

    expect(cards.map((card) => card.title)).toContain('Space weather')
    expect(cards.map((card) => card.href)).toEqual(getHomeAreaCards().map((card) => card.href))
  })
})
