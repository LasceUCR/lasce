import { Carousel } from '@/app/components/public/Carousel'
import type { ConstructionContent } from '@/app/lib/rosac-construction'

export interface ConstructionCarouselProps {
  stages: ConstructionContent['stages']
}

/**
 * The ROSAC construction process carousel. A thin wrapper around the shared
 * `Carousel` component: supplies the ROSAC data as its groups and the
 * ROSAC-specific accessible name. Every other label keeps the `Carousel`
 * defaults, which already match the copy this section shipped with.
 */
export function ConstructionCarousel({ stages }: ConstructionCarouselProps) {
  return <Carousel ariaLabel="Proceso de construcción del ROSAC" groups={stages} />
}
