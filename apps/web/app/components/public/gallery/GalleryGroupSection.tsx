import type { CSSProperties } from 'react'

import { AlbumTile } from './AlbumTile'
import { albumMeta, albumPath, subAlbumPath, type GalleryAlbum } from '@/app/lib/gallery'

export interface GalleryGroupSectionProps {
  album: GalleryAlbum
}

/**
 * One block of the gallery index: a cover tile spanning two rows next to the
 * album's sub-albums. The grid holds one column per tile, so an album without
 * sub-albums renders the cover full width.
 */
export function GalleryGroupSection({ album }: GalleryGroupSectionProps) {
  const headingId = `galeria-${album.slug}`
  const columns = { '--gallery-columns': album.subAlbums.length + 1 } as CSSProperties

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        <h2 id={headingId}>{album.title}</h2>
        <span className="gallery-group-meta">{albumMeta(album)}</span>
      </div>
      <p className="gallery-group-description">{album.description}</p>

      <div className="gallery-grid" style={columns}>
        <AlbumTile
          href={albumPath(album.slug)}
          meta={albumMeta(album)}
          src={album.src}
          title={album.title}
          variant="cover"
        />
        {album.subAlbums.map((subAlbum) => (
          <AlbumTile
            href={subAlbumPath(album.slug, subAlbum.slug)}
            key={subAlbum.slug}
            meta={`${subAlbum.media.length} archivos`}
            src={subAlbum.src}
            title={subAlbum.title}
          />
        ))}
      </div>
    </section>
  )
}
