import type { ResearchArea } from '@/app/lib/research-area-schema'

/**
 * Research areas shaped as `getResearchAreas` returns them for an editor, shared by the stories of
 * the research area editor (and so by its tests, which reuse the stories' `args`).
 */

const VERSION = '2026-10-15T10:00:00.000Z'

const spanish = {
  title: 'Geomagnetismo en Costa Rica',
  description:
    'Estudia las variaciones del campo magnético terrestre ante diferentes condiciones de actividad solar y geomagnética.',
}

export const bilingualArea: ResearchArea = {
  id: '0b6f2a52-3f4c-4a43-9a52-8f7d2b1e9c10',
  ...spanish,
  src: '/images/research/geomagnetismo-costa-rica.jpg',
  contentLocale: 'es',
  editing: {
    content: {
      es: spanish,
      en: {
        title: 'Geomagnetism in Costa Rica',
        description:
          "Studies the variations of the Earth's magnetic field under different conditions of solar and geomagnetic activity.",
      },
    },
    isLegacy: false,
    version: VERSION,
  },
}

const legacyText = {
  title: 'Radioastronomía solar',
  description: 'Estudia las emisiones solares de radio y su relación con los flares.',
}

/** Saved before languages existed: no English row, and its base text's language is unknown. */
export const legacyArea: ResearchArea = {
  id: '5a1d6f0e-2c47-4f7b-8d3e-0c9b1a2e4f60',
  ...legacyText,
  src: '/images/research/radioastronomia-solar-evolucion-flares-cmes.jpg',
  contentLocale: null,
  editing: { content: { es: legacyText, en: null }, isLegacy: true, version: VERSION },
}
