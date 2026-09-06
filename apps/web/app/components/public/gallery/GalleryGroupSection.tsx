import type { CSSProperties } from 'react'

import { AlbumTile } from './AlbumTile'
import { albumPath, type GalleryGroup } from '@/app/lib/gallery'

export interface GalleryGroupSectionProps {
  group: GalleryGroup
}

/**
 * One block of the gallery index: a cover tile spanning two rows next to the
 * group's sub-albums. The grid holds one column per tile, so a group without
 * sub-albums renders the cover full width.
 */
export function GalleryGroupSection({ group }: GalleryGroupSectionProps) {
  const headingId = `galeria-${group.id}`
  const columns = { '--gallery-columns': group.subAlbums.length + 1 } as CSSProperties

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        <h2 id={headingId}>{group.title}</h2>
        <span className="gallery-group-meta">{group.meta}</span>
      </div>
      <p className="gallery-group-description">{group.description}</p>

      <div className="gallery-grid" style={columns}>
        <AlbumTile
          href={group.albumSlug ? albumPath(group.albumSlug) : undefined}
          meta={group.meta}
          src={group.src}
          title={group.title}
          variant="cover"
        />
        {group.subAlbums.map((subAlbum) => (
          <AlbumTile
            key={subAlbum.id}
            meta={`${subAlbum.count} archivos`}
            src={subAlbum.src}
            title={subAlbum.title}
          />
        ))}
      </div>
    </section>
  )
}
