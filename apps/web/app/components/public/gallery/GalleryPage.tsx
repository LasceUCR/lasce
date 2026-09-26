import { GalleryGroupSection } from './GalleryGroupSection'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { galeriaHero, galleryAlbumList } from '@/app/lib/gallery'

export function GalleryPage() {
  return (
    <article className="topic-page">
      <div className="gallery-album-back page-width">
        <TopicBackLink href="/" label="Volver al inicio" />
      </div>

      <TopicHero kicker={galeriaHero.kicker} lead={galeriaHero.lead} title={galeriaHero.title} />

      <div className="gallery-groups page-width">
        {galleryAlbumList.map((album) => (
          <GalleryGroupSection album={album} key={album.slug} />
        ))}
      </div>
    </article>
  )
}
