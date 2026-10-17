import { Carousel, type CarouselGroup } from '@/app/components/public/Carousel'
import type { ConstructionContent, ConstructionStage } from '@/app/lib/rosac-construction'

export interface ConstructionCarouselProps {
  stages: ConstructionContent['stages']
  carousel?: ConstructionContent['carousel']
  canEdit?: boolean
  onEditStage?: (stage: ConstructionStage) => void
}

/**
 * The ROSAC construction process carousel. A thin wrapper around the shared
 * `Carousel` component: supplies the ROSAC data as its groups and the
 * localized or default labels for controls and announcements.
 */
export function ConstructionCarousel({
  stages,
  carousel,
  canEdit = false,
  onEditStage,
}: ConstructionCarouselProps) {
  function handleEditGroup(group: CarouselGroup) {
    if (!onEditStage) return
    const stage = stages.find((s) => s.id === group.id) ?? (group as unknown as ConstructionStage)
    onEditStage(stage)
  }

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
      onEditGroup={canEdit && onEditStage ? handleEditGroup : undefined}
      editGroupLabel="Editar etapa"
    />
  )
}
