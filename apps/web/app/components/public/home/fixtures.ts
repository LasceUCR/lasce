import type { GeomagneticIndicatorData, HomeHeroData } from '@/app/lib/home-schema'

import type { IndicatorItem } from './GeomagneticIndicators'

/**
 * Data shaped as `getHomeContent` returns it for an editor, shared by the stories of the home
 * page components (and so by their tests, which reuse the stories' `args`).
 */

export const VERSION = '2026-10-14T10:00:00.000Z'

const spanishHero = {
  title: 'Exploramos el Sol para comprender el clima espacial',
  lead: 'Investigamos la actividad solar y sus efectos en el medio interplanetario y la Tierra.',
}

export const bilingualHero: HomeHeroData = {
  ...spanishHero,
  contentLocale: 'es',
  editing: {
    content: {
      es: spanishHero,
      en: {
        title: 'We explore the Sun to understand space weather',
        lead: 'We study solar activity and its effects on the interplanetary medium and the Earth.',
      },
    },
    isLegacy: false,
    version: VERSION,
  },
}

/** A banner with no English row yet: its base text's language is unknown. */
export const legacyHero: HomeHeroData = {
  ...bilingualHero,
  contentLocale: null,
  editing: {
    content: { es: spanishHero, en: null },
    isLegacy: true,
    version: VERSION,
  },
}

function indicator(
  id: string,
  code: GeomagneticIndicatorData['code'],
  value: string,
  es: string,
  en: string,
): Omit<GeomagneticIndicatorData, 'position'> {
  return {
    id,
    code,
    value,
    description: es,
    contentLocale: 'es',
    editing: {
      content: { es: { description: es }, en: { description: en } },
      isLegacy: false,
      value,
      version: VERSION,
    },
  }
}

const labels = { kp: 'Índice Kp', dst: 'Índice Dst', ae: 'Índice AE', ap: 'Índice Ap' } as const
const tones = { kp: 'teal', dst: 'cyan', ae: 'blue', ap: 'teal' } as const

export const editableIndicators: IndicatorItem[] = [
  indicator('0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10', 'kp', '2', 'Tranquilo', 'Quiet'),
  indicator('5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60', 'dst', '-12 nT', 'Estable', 'Stable'),
  indicator(
    '9d0c8f9e-1111-4c1a-9b2e-3f4a5b6c7d8e',
    'ae',
    '75 nT',
    'Actividad baja',
    'Low activity',
  ),
  indicator('2e4f6a8b-0c1d-4e2f-8a3b-5c7d9e1f2a3b', 'ap', '7', 'Tranquilo', 'Quiet'),
].map(({ code, ...data }, position) => ({
  ...data,
  position,
  label: labels[code],
  tone: tones[code],
}))

/** The same indices as a visitor receives them: no editing data. */
export const publicIndicators: IndicatorItem[] = editableIndicators.map(
  ({ editing: _editing, ...data }) => data,
)
