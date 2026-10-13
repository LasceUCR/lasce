import { Carousel } from '@/app/components/public/Carousel'
import type { ConstructionContent } from '@/app/lib/rosac-construction'

export interface ConstructionCarouselProps {
  stages: ConstructionContent['stages']
  carousel?: ConstructionContent['carousel']
}

/**
 * The ROSAC construction process carousel. A thin wrapper around the shared
 * `Carousel` component: supplies the ROSAC data as its groups and the
 * localized or default labels for controls and announcements.
 */
export function ConstructionCarousel({ stages, carousel }: ConstructionCarouselProps) {
  return (
    <Carousel
      ariaLabel={carousel?.ariaLabel ?? 'Proceso de construcción del ROSAC'}
      groupNoun={carousel?.groupNoun}
      imageUnavailableMessage={carousel?.imageUnavailableMessage}
      nextGroupLabel={carousel?.nextGroupLabel}
      nextPhotoLabel={carousel?.nextPhotoLabel}
      ofPreposition={carousel?.ofPreposition}
      photoNoun={carousel?.photoNoun}
      previousGroupLabel={carousel?.previousGroupLabel}
      previousPhotoLabel={carousel?.previousPhotoLabel}
      groups={stages}
    />
  )
}
