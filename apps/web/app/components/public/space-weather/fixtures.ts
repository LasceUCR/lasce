import type { SpaceWeatherSection } from '@/app/lib/space-weather-section-schema'

/**
 * Data shaped as `getSpaceWeatherSection` returns it for an editor, shared by the stories of the
 * space weather components (and so by their tests, which reuse the stories' `args`).
 */

export const VERSION = '2026-10-16T12:00:00.000Z'

const spanish = {
  title: '¿Por qué estudiarlo desde Costa Rica?',
  body: 'La respuesta de la ionosfera puede depender de la ubicación geográfica.\n\nContar con observaciones desde Costa Rica permite caracterizar mejor el entorno regional.',
}

const english = {
  title: 'Why study it from Costa Rica?',
  body: 'The response of the ionosphere can depend on geographic location.\n\nObservations made from Costa Rica make it possible to characterise the regional environment better.',
}

export const bilingualSection: SpaceWeatherSection = {
  title: spanish.title,
  paragraphs: spanish.body.split('\n\n'),
  contentLocale: 'es',
  editing: {
    content: { es: spanish, en: english },
    isLegacy: false,
    version: VERSION,
  },
}

/** A section with no English row yet: its base text's language is unknown. */
export const legacySection: SpaceWeatherSection = {
  ...bilingualSection,
  contentLocale: null,
  editing: {
    content: { es: spanish, en: null },
    isLegacy: true,
    version: VERSION,
  },
}
