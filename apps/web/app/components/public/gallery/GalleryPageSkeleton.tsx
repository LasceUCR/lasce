import { Skeleton } from '@/app/components/public/skeleton/Skeleton'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'

import { GalleryTileSkeleton } from './GalleryTileSkeleton'

const GROUP_COUNT = 2
const SUB_TILES_PER_GROUP = 2

export interface GalleryPageSkeletonProps {
  kicker: string
  title: string
  lead: string
  /** Announced while the album groups are still loading. Already translated. */
  label: string
  backLabel: string
}

/**
 * `/galeria`'s `loading.tsx`. The hero and the back link are the page's own fixed copy, not
 * database content, so they render for real straight away; only the album groups — the dynamic
 * part `getGalleryAlbums` has not answered yet — show placeholders. Every string arrives already
 * translated, the same split as `PublicationsPageSkeleton`, since a Server Component's
 * `loading.tsx` can read the visitor's language itself.
 */
export function GalleryPageSkeleton({
  kicker,
  title,
  lead,
  label,
  backLabel,
}: GalleryPageSkeletonProps) {
  return (
    <article className="topic-page">
      <TopicHero kicker={kicker} lead={lead} title={title} />

      <p className="sr-only" role="status">
        {label}
      </p>

      <div className="gallery-groups page-width" aria-hidden="true">
        {Array.from({ length: GROUP_COUNT }, (_, groupIndex) => (
          <section className="gallery-group" key={groupIndex}>
            <div className="gallery-group-heading">
              <Skeleton shape="text" width="35%" />
            </div>
            <Skeleton shape="text" width="60%" />
            <ul className="gallery-grid tile-list">
              <li>
                <GalleryTileSkeleton variant="cover" />
              </li>
              {Array.from({ length: SUB_TILES_PER_GROUP }, (_, tileIndex) => (
                <li key={tileIndex}>
                  <GalleryTileSkeleton />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={backLabel} />
      </div>
    </article>
  )
}
