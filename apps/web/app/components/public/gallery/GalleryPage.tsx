import { GalleryGroupSection } from './GalleryGroupSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { galeriaHero, galleryAlbumList } from '@/app/lib/gallery'

export interface GalleryPageProps {
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function GalleryPage({
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: GalleryPageProps) {
  return (
    <article className="topic-page">
      <TopicHero kicker={galeriaHero.kicker} lead={galeriaHero.lead} title={galeriaHero.title} />

      <div className="gallery-groups page-width">
        {galleryAlbumList.map((album) => (
          <GalleryGroupSection
            album={album}
            key={album.slug}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
      </div>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label="Volver al inicio" />
      </div>
    </article>
  )
}
