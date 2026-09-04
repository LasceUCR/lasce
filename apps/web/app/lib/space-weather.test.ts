import { describe, expect, test } from 'vitest'

import {
  spaceWeatherBackLink,
  spaceWeatherComponents,
  spaceWeatherContentFlag,
  spaceWeatherHero,
  spaceWeatherImpacts,
  spaceWeatherLasce,
  spaceWeatherMeta,
  spaceWeatherSolarActivity,
} from './space-weather'

describe('space-weather content', () => {
  test('exposes indexable metadata and the public page copy', () => {
    expect(spaceWeatherMeta.title).toBe('Clima espacial | LASCE')
    expect(spaceWeatherMeta.description).toMatch(/clima espacial/i)
    expect(spaceWeatherHero.title).toBe('Clima espacial')
    expect(spaceWeatherContentFlag.label).toBe('Información provisional')
    expect(spaceWeatherBackLink.href).toBe('/#areas-de-trabajo')
  })

  test('covers the solar chain, impacts and LASCE overview', () => {
    expect(spaceWeatherComponents.items.map((item) => item.title)).toContain('Actividad solar')
    expect(spaceWeatherSolarActivity.items.map((item) => item.title)).toContain('Fulguraciones')
    expect(spaceWeatherImpacts.items).toHaveLength(6)
    expect(spaceWeatherLasce.paragraphs.length).toBeGreaterThan(0)
  })
})
