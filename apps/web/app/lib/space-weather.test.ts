import { describe, expect, test } from 'vitest'

import {
  spaceWeatherBackLink,
  spaceWeatherComponents,
  spaceWeatherCostaRica,
  spaceWeatherDefinition,
  spaceWeatherHero,
  spaceWeatherMeta,
  spaceWeatherSunToEarth,
} from './space-weather'

describe('space-weather content', () => {
  test('exposes indexable metadata and the public page copy', () => {
    expect(spaceWeatherMeta.title).toBe('Clima espacial | LASCE')
    expect(spaceWeatherMeta.description).toMatch(/clima espacial/i)
    expect(spaceWeatherHero.title).toBe('Clima espacial')
    expect(spaceWeatherDefinition.title).toBe('¿Qué es el clima espacial?')
    expect(spaceWeatherDefinition.paragraphs).toEqual([
      'El clima espacial describe las condiciones variables del Sol, el viento solar y la ionosfera que pueden influir en las inmediaciones de la Tierra y en los sistemas tecnológicos. No es el clima atmosférico cotidiano: se origina principalmente en la actividad solar y se manifiesta en el entorno espacial de nuestro planeta.',
    ])
    expect(spaceWeatherSunToEarth.items).toHaveLength(4)
    expect(spaceWeatherCostaRica.title).toMatch(/Costa Rica/)
    expect(spaceWeatherBackLink.href).toBe('/#areas-de-trabajo')
  })

  test('covers the solar chain', () => {
    expect(spaceWeatherComponents.items.map((item) => item.title)).toContain('Actividad solar')
  })
})
