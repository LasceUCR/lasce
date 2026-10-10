import { rosacInstruments } from './scientific-data'

export interface RosacInstrumentCardContent {
  id: string
  name: string
  pendingMessage?: string
  image?: { src: string; alt: string }
  purpose?: string
  characteristics?: readonly string[]
  citation?: string
  /**
   * The card's action. Without `href` the destination is not available yet, so the button is
   * rendered disabled; keep the `label` so all cards show the same action in the same place.
   */
  consultation?: { href?: string; label: string; notice?: string }
}

export interface RosacInstrumentsContent {
  title: string
  intro: string
  items: readonly RosacInstrumentCardContent[]
}

// Temporary gallery photographs illustrate the mock cards, not confirmed instrument identities.
const instrumentImages = [
  {
    src: '/images/ROSAC/construction/Fotogrametria/Fotogrametria_1.jpg',
    alt: 'Imagen ilustrativa de la galería ROSAC: dos antenas de noche y una plataforma elevadora.',
  },
  {
    src: '/images/ROSAC/construction/Montaje/montaje_4.jpg',
    alt: 'Imagen ilustrativa de la galería ROSAC: trabajos en el mecanismo de rotación de la antena.',
  },
  {
    src: '/images/ROSAC/construction/Montaje/montaje_3.jpg',
    alt: 'Imagen ilustrativa de la galería ROSAC: montaje de la estructura radial de la antena.',
  },
] as const

/**
 * The first two cards describe the existing simulations; the third awaits integration and shows
 * its action disabled until a simulation exists.
 */
export const rosacInstrumentsContent: RosacInstrumentsContent = {
  title: 'Instrumentos científicos',
  intro:
    'Explore las simulaciones de los instrumentos de ROSAC. Las fotografías son ilustrativas y provienen de la galería del observatorio.',
  items: [
    {
      id: rosacInstruments[0]!.code,
      name: 'ROSAC-SABER',
      characteristics: ['Banda entre 100 y 1000 MHz'],
      image: instrumentImages[0],
      consultation: {
        href: `/datos?source=ROSAC&instrument=${rosacInstruments[0]!.code}#scientific-query-title`,
        label: 'Consultar simulación del instrumento 1',
        notice: `${rosacInstruments[0]!.products[0]!.name}. Los resultados son simulados; no corresponden a observaciones del instrumento.`,
      },
    },
    {
      id: rosacInstruments[1]!.code,
      name: 'ROSAC-MIRA 9GHz',
      characteristics: ['Banda de los 9 GHz'],
      image: instrumentImages[1],
      consultation: {
        href: `/datos?source=ROSAC&instrument=${rosacInstruments[1]!.code}#scientific-query-title`,
        label: 'Consultar simulación del instrumento 2',
        notice: `${rosacInstruments[1]!.products[0]!.name}. Los resultados son simulados; no corresponden a observaciones del instrumento.`,
      },
    },
    {
      id: 'rosac-instrument-3',
      name: 'ROSAC-HIROS',
      characteristics: ['Observación del hidrógeno neutro a 1,4 GHz'],
      image: instrumentImages[2],
      pendingMessage: 'Información pendiente de confirmación e integración en la sección de datos.',
      consultation: { label: 'Consultar simulación del instrumento 3' },
    },
  ],
}
