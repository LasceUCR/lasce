import { describe, expect, test } from 'vitest'

import { getMessages } from './i18n/messages'
import {
  getSpaceWeatherContent,
  spaceWeatherBackLink,
  spaceWeatherComponents,
  spaceWeatherContent,
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
    expect(spaceWeatherSunToEarth.items.find((item) => item.id === 'release')?.description).toBe(
      'Las fulguraciones o llamaradas solares se encuentran entre los fenómenos más energéticos del Sol. Implican una liberación rápida de energía magnética, la aceleración de partículas y un aumento de la radiación electromagnética. Con frecuencia, están asociadas con eyecciones de masa coronal (CME), erupciones a gran escala de plasma y campo magnético que pueden alcanzar la Tierra y desencadenar tormentas geomagnéticas.',
    )

    const spanishById = Object.fromEntries(
      spaceWeatherComponents.items.map((item) => [item.id, item.description]),
    )
    expect(spanishById.solarActivity).toBe(
      'Como parte de la astrofísica solar, estudiamos el Sol como una estrella dinámica, incluidas las regiones activas, las llamaradas solares, las eyecciones de masa coronal y otros fenómenos que liberan energía y partículas al espacio y perturban el campo magnético interplanetario.',
    )
    expect(spanishById.solarWind).toBe(
      'El viento solar es un flujo continuo de partículas cargadas en estado de plasma que se desplaza desde el Sol hacia el exterior a través del espacio interplanetario.',
    )
    expect(spanishById.magnetosphere).toBe(
      'La magnetosfera terrestre es la región que rodea nuestro planeta, donde domina el campo magnético de la Tierra y se produce la interacción con el viento solar. Cuando el viento solar se intensifica, puede comprimir y perturbar la magnetosfera.',
    )
    expect(spanishById.particles).toBe(
      'La actividad solar también puede acelerar partículas hasta alcanzar energías muy altas. Estas partículas energéticas solares (SEP, por sus siglas en inglés) pueden afectar los satélites y aumentar la exposición a la radiación en vuelos de gran altitud y sobre regiones polares.',
    )
  })

  test('follows the catalogue it is given and keeps the same structure', () => {
    const english = getSpaceWeatherContent(getMessages('en'))

    expect(english.hero.title).toBe('Space weather')
    expect(english.components.flow.steps).toEqual(['Sun', 'Solar wind', 'Magnetosphere', 'Earth'])
    expect(english.sunToEarth.items.map((item) => item.id)).toEqual(
      spaceWeatherContent.sunToEarth.items.map((item) => item.id),
    )
    expect(english.components.items.map((item) => item.id)).toEqual(
      spaceWeatherContent.components.items.map((item) => item.id),
    )
    expect(english.sunToEarth.items.find((item) => item.id === 'release')?.description).toBe(
      'Solar flares are among the most energetic phenomena on the Sun. They involve the rapid release of magnetic energy, particle acceleration, and enhanced electromagnetic radiation. Flares are often associated with coronal mass ejections (CMEs), large-scale eruptions of plasma and magnetic field that can reach Earth and trigger geomagnetic storms.',
    )

    const englishById = Object.fromEntries(
      english.components.items.map((item) => [item.id, item.description]),
    )
    expect(englishById.solarActivity).toBe(
      'As part of solar astrophysics, we study the Sun as a dynamic star, including active regions, solar flares, coronal mass ejections, and other phenomena that release energy and particles into space and disturb the interplanetary magnetic field.',
    )
    expect(englishById.solarWind).toBe(
      'The solar wind is a continuous flow of charged particles in a plasma state that travels outward from the Sun through interplanetary space.',
    )
    expect(englishById.magnetosphere).toBe(
      'Earth’s magnetosphere is the region surrounding the planet where its magnetic field is dominant and interacts with the solar wind. When the solar wind intensifies, it can compress and disturb the magnetosphere.',
    )
    expect(englishById.particles).toBe(
      'Solar activity can also accelerate particles to high energies. These solar energetic particles (SEPs) can affect satellites and increase radiation exposure on high-altitude and polar flights.',
    )
    expect(english.backLink.href).toBe(spaceWeatherContent.backLink.href)
  })
})
