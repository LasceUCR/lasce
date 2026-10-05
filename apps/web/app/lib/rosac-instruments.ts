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
    ...rosacInstruments.map((instrument, index) => ({
      id: instrument.code,
      name: `Instrumento ${index + 1}`,
      image: instrumentImages[index],
      consultation: {
        href: `/datos?source=ROSAC&instrument=${instrument.code}#scientific-query-title`,
        label: `Consultar simulación del instrumento ${index + 1}`,
        notice: `${instrument.products[0]!.name}. Los resultados son simulados; no corresponden a observaciones del instrumento.`,
      },
    })),
    {
      id: 'rosac-instrument-3',
      name: 'Instrumento 3 (por definir)',
      image: instrumentImages[2],
      pendingMessage: 'Información pendiente de confirmación e integración en la sección de datos.',
      consultation: { label: 'Consultar simulación del instrumento 3' },
    },
  ],
}
