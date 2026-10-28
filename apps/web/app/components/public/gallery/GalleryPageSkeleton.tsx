import { Skeleton } from '@/app/components/public/skeleton/Skeleton'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { galeriaHero } from '@/app/lib/gallery-content'

import { GalleryTileSkeleton } from './GalleryTileSkeleton'

const GROUP_COUNT = 2
const SUB_TILES_PER_GROUP = 2

/**
 * `/galeria`'s `loading.tsx`. The hero and the back link are the page's own fixed copy, not
 * database content, so they render for real straight away; only the album groups — the dynamic
 * part `getGalleryAlbums` has not answered yet — show placeholders.
 */
export function GalleryPageSkeleton() {
  return (
    <article className="topic-page">
      <TopicHero kicker={galeriaHero.kicker} lead={galeriaHero.lead} title={galeriaHero.title} />

      <p className="sr-only" role="status">
        Cargando galería…
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
        <TopicBackLink href="/#areas-de-trabajo" label="Volver al inicio" />
      </div>
    </article>
  )
}
