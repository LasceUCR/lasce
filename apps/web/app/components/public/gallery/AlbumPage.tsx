import { AlbumMediaGrid } from './AlbumMediaGrid'
import { AlbumTile } from './AlbumTile'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { albumMediaMeta, type GalleryAlbum } from '@/app/lib/gallery'

export interface AlbumPageProps {
  album: GalleryAlbum
}

export function AlbumPage({ album }: AlbumPageProps) {
  return (
    <article className="topic-page">
      <div className="gallery-album-back page-width">
        <TopicBackLink href="/galeria" label="Volver a la galería" />
      </div>

      <TopicHero
        kicker="Galería LASCE"
        lead={album.description}
        notice={album.meta}
        title={album.title}
      />

      {album.subAlbums.length > 0 ? (
        <TopicSection title="Subálbumes" titleId="album-subalbums">
          <div className="card-grid card-grid-3">
            {album.subAlbums.map((subAlbum) => (
              <AlbumTile
                key={subAlbum.id}
                meta={`${subAlbum.count} archivos`}
                src={subAlbum.src}
                title={subAlbum.title}
              />
            ))}
          </div>
        </TopicSection>
      ) : null}

      <TopicSection
        badge={albumMediaMeta(album)}
        title="Fotografías y video de este álbum"
        titleId="album-media"
      >
        <AlbumMediaGrid albumTitle={album.title} media={album.media} />
      </TopicSection>
    </article>
  )
}
