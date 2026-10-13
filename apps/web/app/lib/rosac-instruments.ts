import es from '@/messages/es.json' with { type: 'json' }

import { rosacInstruments } from './scientific-data'

export interface InstrumentCardLabels {
  purpose: string
  characteristics: string
  citation: string
  imageUnavailable: string
  imagePending: string
}

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
  labels?: InstrumentCardLabels
}

export interface RosacInstrumentsContent {
  title: string
  intro: string
  items: readonly RosacInstrumentCardContent[]
}

// Temporary gallery photographs illustrate the mock cards, not confirmed instrument identities.
const instrumentImageSources = [
  '/images/ROSAC/construction/Fotogrametria/Fotogrametria_1.jpg',
  '/images/ROSAC/construction/Montaje/montaje_4.jpg',
  '/images/ROSAC/construction/Montaje/montaje_3.jpg',
] as const

/** The parts of a message catalogue the instruments section reads. */
export type RosacInstrumentsMessages = Pick<typeof es, 'rosac'>

/**
 * The instruments content in the language of `messages`.
 * The route passes the request's catalogue.
 */
export function getRosacInstrumentsContent(
  messages: RosacInstrumentsMessages,
): RosacInstrumentsContent {
  const rosac = messages?.rosac ?? es.rosac
  const instruments = rosac?.instruments ?? es.rosac.instruments
  const card = instruments?.card ?? es.rosac.instruments.card
  const products = instruments?.products ?? es.rosac.instruments.products
  const images = instruments?.images ?? es.rosac.instruments.images

  const labels: InstrumentCardLabels = {
    purpose: card?.purpose ?? es.rosac.instruments.card.purpose,
    characteristics: card?.characteristics ?? es.rosac.instruments.card.characteristics,
    citation: card?.citation ?? es.rosac.instruments.card.citation,
    imageUnavailable: card?.imageUnavailable ?? es.rosac.instruments.card.imageUnavailable,
    imagePending: card?.imagePending ?? es.rosac.instruments.card.imagePending,
  }

  const localizedImages = [
    { src: instrumentImageSources[0], alt: images?.img1 ?? es.rosac.instruments.images.img1 },
    { src: instrumentImageSources[1], alt: images?.img2 ?? es.rosac.instruments.images.img2 },
    { src: instrumentImageSources[2], alt: images?.img3 ?? es.rosac.instruments.images.img3 },
  ] as const

  const productNames = [
    products?.timeSeries ?? es.rosac.instruments.products.timeSeries,
    products?.dynamicSpectrum ?? es.rosac.instruments.products.dynamicSpectrum,
  ]

  const cardName = card?.name ?? es.rosac.instruments.card.name
  const consultationLabel = card?.consultationLabel ?? es.rosac.instruments.card.consultationLabel
  const consultationNotice =
    card?.consultationNotice ?? es.rosac.instruments.card.consultationNotice

  const items: RosacInstrumentCardContent[] = [
    ...rosacInstruments.map((instrument, index) => {
      const number = String(index + 1)
      const productName = productNames[index] ?? instrument.products[0]?.name ?? ''
      return {
        id: instrument.code,
        name: cardName.replace('{number}', number),
        image: localizedImages[index],
        consultation: {
          href: `/datos?source=ROSAC&instrument=${instrument.code}#scientific-query-title`,
          label: consultationLabel.replace('{number}', number),
          notice: consultationNotice.replace('{product}', productName),
        },
        labels,
      }
    }),
    {
      id: 'rosac-instrument-3',
      name: card?.pendingName ?? es.rosac.instruments.card.pendingName,
      image: localizedImages[2],
      pendingMessage: card?.pendingNotice ?? es.rosac.instruments.card.pendingNotice,
      consultation: { label: consultationLabel.replace('{number}', '3') },
      labels,
    },
  ]

  return {
    title: instruments?.title ?? es.rosac.instruments.title,
    intro: instruments?.intro ?? es.rosac.instruments.intro,
    items,
  }
}

/**
 * The first two cards describe the existing simulations; the third awaits integration and shows
 * its action disabled until a simulation exists.
 */
export const rosacInstrumentsContent: RosacInstrumentsContent = getRosacInstrumentsContent(es)
