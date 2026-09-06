import { GalleryGroupSection } from './GalleryGroupSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { galeriaHero, galleryGroups } from '@/app/lib/gallery'

export function GalleryPage() {
  return (
    <article className="topic-page">
      <TopicHero kicker={galeriaHero.kicker} lead={galeriaHero.lead} title={galeriaHero.title} />

      <div className="gallery-groups page-width">
        {galleryGroups.map((group) => (
          <GalleryGroupSection group={group} key={group.id} />
        ))}
      </div>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label="Volver al inicio" />
      </div>
    </article>
  )
}
