import { Skeleton } from '@/app/components/public/skeleton/Skeleton'
import { TopicSection } from '@/app/components/public/topic/TopicSection'

import { GalleryTileSkeleton } from './GalleryTileSkeleton'
import { MediaTileSkeleton } from './MediaTileSkeleton'

const SUBALBUM_TILE_COUNT = 3
const MEDIA_TILE_COUNT = 6

export interface AlbumPageSkeletonProps {
  /** "Galería LASCE": the same kicker every album detail page carries. Already translated. */
  kicker: string
  /** Announced while the album's own data is still loading. Already translated. */
  label: string
  /** "Subálbumes". Already translated. */
  subalbumsTitle: string
  /** "Fotografías y video de este álbum". Already translated. */
  mediaTitle: string
  /** False on a sub-album page, which never lists children of its own. */
  hasSubAlbums?: boolean
}

/**
 * `/galeria/[slug]`'s and `/galeria/[slug]/[subalbum]`'s `loading.tsx`. Unlike the index page,
 * the hero here shows per-album data (title, description, file count) that is not known until
 * `getGalleryAlbums` answers, so it is placeholders too — only the kicker and the section titles
 * are catalogue copy, passed in already translated by `loading.tsx`, which reads the visitor's
 * language itself.
 */
export function AlbumPageSkeleton({
  kicker,
  label,
  subalbumsTitle,
  mediaTitle,
  hasSubAlbums = true,
}: AlbumPageSkeletonProps) {
  return (
    <article className="topic-page">
      <header className="topic-hero topic-hero-copy-only">
        <div className="topic-hero-copy">
          <p className="topic-kicker">{kicker}</p>
          <Skeleton height={40} shape="text" width="55%" />
          <Skeleton shape="text" width="85%" />
          <Skeleton shape="text" width="35%" />
        </div>
      </header>

      <p className="sr-only" role="status">
        {label}
      </p>

      {hasSubAlbums ? (
        <TopicSection title={subalbumsTitle} titleId="album-subalbums">
          <ul className="card-grid card-grid-3 tile-list gallery-subalbum-list">
            {Array.from({ length: SUBALBUM_TILE_COUNT }, (_, index) => (
              <li key={index}>
                <GalleryTileSkeleton />
              </li>
            ))}
          </ul>
        </TopicSection>
      ) : null}

      <TopicSection title={mediaTitle} titleId="album-media">
        <ul className="media-grid tile-list">
          {Array.from({ length: MEDIA_TILE_COUNT }, (_, index) => (
            <MediaTileSkeleton key={index} />
          ))}
        </ul>
      </TopicSection>

      <div className="topic-page-footer gallery-album-footer page-width">
        <Skeleton height={16} shape="text" width="140px" />
      </div>
    </article>
  )
}
