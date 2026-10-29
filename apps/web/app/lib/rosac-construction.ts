import es from '@/messages/es.json' with { type: 'json' }

export interface ConstructionImage {
  src: string
  alt: string
}

export interface ConstructionStage {
  id: string
  title: string
  navigationLabel: string
  description: string
  images: readonly [ConstructionImage, ConstructionImage, ...ConstructionImage[]]
  editing?: {
    content: {
      es: { title: string; description: string }
      en: { title: string; description: string } | null
    }
    isLegacy: boolean
    version: string
  }
}

export interface ConstructionCarouselCopy {
  ariaLabel: string
  groupNoun: string
  photoNoun: string
  previousGroupLabel: string
  nextGroupLabel: string
  previousPhotoLabel: string
  nextPhotoLabel: string
  imageUnavailableMessage: string
  ofPreposition?: string
}

export interface ConstructionContent {
  title: string
  intro: string
  stages: readonly [ConstructionStage, ...ConstructionStage[]]
  carousel?: ConstructionCarouselCopy
}

export const constructionStageIds = [
  'preparacion',
  'estructura',
  'paneles',
  'fotogrametria',
  'instalacion',
] as const
export type ConstructionStageId = (typeof constructionStageIds)[number]

// Photos live in one subfolder per stage now (moved there directly on disk), rather than all
// flat under a single directory -- folder names carry spaces, so they are percent-encoded here
// (`%20`) rather than left as literal spaces in the URL.
const preparacionBase = '/images/ROSAC/construction/Preparacion%20Montaje'
const estructuraBase = '/images/ROSAC/construction/Montaje'
const panelesBase = '/images/ROSAC/construction/Montaje%20Paneles'
const fotogrametriaBase = '/images/ROSAC/construction/Fotogrametria'
const instalacionBase = '/images/ROSAC/construction/Intalacion%20Electrica'

const stageImagePaths = {
  preparacion: [
    `${preparacionBase}/prev_montaje_1.jpg`,
    `${preparacionBase}/prev_montaje_2.jpg`,
    `${preparacionBase}/prev_montaje_3.jpg`,
    `${preparacionBase}/prev_montaje_4.jpg`,
    `${preparacionBase}/prev_montaje_5.jpg`,
  ],
  estructura: [
    `${estructuraBase}/montaje_1.jpeg`,
    `${estructuraBase}/montaje_2.jpeg`,
    `${estructuraBase}/montaje_3.jpg`,
    `${estructuraBase}/montaje_4.jpg`,
    `${estructuraBase}/montaje_5.jpg`,
  ],
  paneles: [
    `${panelesBase}/montaje_1.jpg`,
    `${panelesBase}/montaje_2.jpg`,
    `${panelesBase}/montaje_3.jpeg`,
    `${panelesBase}/montaje_4.jpg`,
    `${panelesBase}/montaje_5.jpg`,
  ],
  fotogrametria: [
    `${fotogrametriaBase}/Fotogrametria_1.jpg`,
    `${fotogrametriaBase}/Fotogrametria_2.jpeg`,
    `${fotogrametriaBase}/Fotogrametria_3.jpeg`,
  ],
  instalacion: [
    `${instalacionBase}/elect_1.jpeg`,
    `${instalacionBase}/elect_2.jpg`,
    `${instalacionBase}/elect_3.jpeg`,
    `${instalacionBase}/elect_4.jpeg`,
    `${instalacionBase}/elect_5.jpeg`,
  ],
} as const

/** The parts of a message catalogue the construction section reads. */
export type RosacConstructionMessages = Pick<typeof es, 'rosac'>

/**
 * The construction content in the language of `messages`.
 * The route passes the request's catalogue.
 */
export function getRosacConstructionContent(
  messages: RosacConstructionMessages,
): ConstructionContent {
  const rosac = messages?.rosac ?? es.rosac
  const construction = rosac?.construction ?? es.rosac.construction
  const carousel = construction?.carousel ?? es.rosac.construction.carousel

  const stages = constructionStageIds.map((id) => {
    const fallbackStageMsg = es.rosac.construction.stages[id]
    const stageMsg = construction?.stages?.[id] ?? fallbackStageMsg
    const paths = stageImagePaths[id]
    const images = paths.map((src, index) => {
      const imgKey = `img${index + 1}` as keyof typeof fallbackStageMsg.images
      return {
        src,
        alt: stageMsg?.images?.[imgKey] ?? fallbackStageMsg.images[imgKey] ?? '',
      }
    }) as unknown as [ConstructionImage, ConstructionImage, ...ConstructionImage[]]

    return {
      id,
      title: stageMsg?.title ?? fallbackStageMsg.title,
      navigationLabel: stageMsg?.navigationLabel ?? fallbackStageMsg.navigationLabel,
      description: stageMsg?.description ?? fallbackStageMsg.description,
      images,
    }
  }) as unknown as [ConstructionStage, ...ConstructionStage[]]

  return {
    title: construction?.title ?? es.rosac.construction.title,
    intro: construction?.intro ?? es.rosac.construction.intro,
    stages,
    carousel: {
      ariaLabel: carousel.ariaLabel ?? es.rosac.construction.carousel.ariaLabel,
      groupNoun: carousel.groupNoun ?? es.rosac.construction.carousel.groupNoun,
      photoNoun: carousel.photoNoun ?? es.rosac.construction.carousel.photoNoun,
      previousGroupLabel: carousel.previousGroup ?? es.rosac.construction.carousel.previousGroup,
      nextGroupLabel: carousel.nextGroup ?? es.rosac.construction.carousel.nextGroup,
      previousPhotoLabel: carousel.previousPhoto ?? es.rosac.construction.carousel.previousPhoto,
      nextPhotoLabel: carousel.nextPhoto ?? es.rosac.construction.carousel.nextPhoto,
      imageUnavailableMessage:
        carousel.imageUnavailable ?? es.rosac.construction.carousel.imageUnavailable,
      ofPreposition: carousel.of ?? es.rosac.construction.carousel.of,
    },
  }
}

/** The construction content in Spanish, the source language. For stories and tests. */
export const rosacConstructionContent: ConstructionContent = getRosacConstructionContent(es)
