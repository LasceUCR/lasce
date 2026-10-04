import { describe, expect, test } from 'vitest'

import { getMessages } from './i18n/messages'
import { getSolarAstrophysicsContent, solarAstrophysicsContent } from './solar-astrophysics'

describe('solar astrophysics content', () => {
  test('is Spanish by default, with four study areas and a four-step chain', () => {
    expect(solarAstrophysicsContent.hero.title).toBe('Astrofísica solar')
    expect(solarAstrophysicsContent.overview.items.map((item) => item.title)).toEqual([
      'Actividad solar',
      'Campo magnético',
      'Relación Sol-Tierra',
      'Análisis científico',
    ])
    expect(solarAstrophysicsContent.overview.flow.steps).toEqual([
      'Sol',
      'Perturbación solar',
      'Entorno terrestre',
      'Análisis LASCE',
    ])
    expect(solarAstrophysicsContent.lasce.paragraphs).toHaveLength(3)
  })

  test('follows the catalogue it is given and keeps the same structure', () => {
    const english = getSolarAstrophysicsContent(getMessages('en'))

    expect(english.hero.title).toBe('Solar astrophysics')
    expect(english.overview.flow.steps).toEqual([
      'Sun',
      'Solar disturbance',
      "Earth's environment",
      'LASCE analysis',
    ])
    expect(english.overview.items.map((item) => item.id)).toEqual(
      solarAstrophysicsContent.overview.items.map((item) => item.id),
    )
    expect(english.backLink.href).toBe(solarAstrophysicsContent.backLink.href)
  })
})
