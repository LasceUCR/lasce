import { describe, expect, test } from 'vitest'

import { getResearchArea, researchAreaSlugs, researchAreas } from './research-areas'

describe('research-areas', () => {
  test('exposes one unique slug per research area, in page order', () => {
    expect(researchAreaSlugs).toEqual(researchAreas.map((area) => area.slug))
    expect(new Set(researchAreaSlugs).size).toBe(researchAreaSlugs.length)
  })

  test('finds a research area by its slug', () => {
    for (const area of researchAreas) {
      expect(getResearchArea(area.slug)).toBe(area)
    }
  })

  test('returns nothing for an unknown slug', () => {
    expect(getResearchArea('no-existe')).toBeUndefined()
  })

  test('gives every research area a title and a description to show on its card', () => {
    for (const area of researchAreas) {
      expect(area.title.trim()).not.toBe('')
      expect(area.description.trim()).not.toBe('')
    }
  })
})
