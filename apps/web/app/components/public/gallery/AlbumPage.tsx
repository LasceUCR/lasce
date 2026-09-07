import { AlbumMediaGrid } from './AlbumMediaGrid'
import { AlbumTile } from './AlbumTile'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  albumMediaMeta,
  subAlbumPath,
  type GalleryMedia,
  type GallerySubAlbum,
} from '@/app/lib/gallery'

export interface AlbumPageProps {
  title: string
  description: string
  /** Summary line under the title: file counts and the period covered. */
  meta: string
  media: readonly GalleryMedia[]
  /** Empty on a sub-album page, which has no children of its own. */
  subAlbums?: readonly GallerySubAlbum[]
  /** Slug the sub-album links hang off. Required when `subAlbums` is given. */
  parentSlug?: string
  backHref?: string
  backLabel?: string
}

/**
 * The detail page shared by albums and sub-albums: they differ only in whether
 * they list children and in where their back link points.
 */
export function AlbumPage({
  title,
  description,
  meta,
  media,
  subAlbums = [],
  parentSlug,
  backHref = '/galeria',
  backLabel = 'Volver a la galería',
}: AlbumPageProps) {
  return (
    <article className="topic-page">
      <div className="gallery-album-back page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>

      <TopicHero kicker="Galería LASCE" lead={description} notice={meta} title={title} />

      {subAlbums.length > 0 && parentSlug ? (
        <TopicSection title="Subálbumes" titleId="album-subalbums">
          <div className="card-grid card-grid-3">
            {subAlbums.map((subAlbum) => (
              <AlbumTile
                href={subAlbumPath(parentSlug, subAlbum.slug)}
                key={subAlbum.slug}
                meta={`${subAlbum.media.length} archivos`}
                src={subAlbum.src}
                title={subAlbum.title}
              />
            ))}
          </div>
        </TopicSection>
      ) : null}

      <TopicSection
        badge={albumMediaMeta(media)}
        title="Fotografías y video de este álbum"
        titleId="album-media"
      >
        <AlbumMediaGrid albumTitle={title} media={media} />
      </TopicSection>
    </article>
  )
}
