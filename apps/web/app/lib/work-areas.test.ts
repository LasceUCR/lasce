import { describe, expect, test } from 'vitest'

import {
  getHomeAreaCards,
  getWorkAreaCards,
  isWorkAreaSlug,
  workAreaPath,
  workAreaSlugs,
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
})
