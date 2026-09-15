import { AlbumTile } from './AlbumTile'
import { albumMeta, albumPath, subAlbumPath, type GalleryAlbum } from '@/app/lib/gallery'

export interface GalleryGroupSectionProps {
  album: GalleryAlbum
}

/**
 * One block of the gallery index: the album's cover tile followed by its
 * sub-albums. Every tile is the same size and the grid wraps, so the number of
 * sub-albums changes how many rows a block occupies, never how wide its cards
 * are. Card sizing lives entirely in `.gallery-grid`; nothing here measures.
 */
export function GalleryGroupSection({ album }: GalleryGroupSectionProps) {
  const headingId = `galeria-${album.slug}`

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        <h2 id={headingId}>{album.title}</h2>
        <span className="gallery-group-meta">{albumMeta(album)}</span>
      </div>
      <p className="gallery-group-description">{album.description}</p>

      {/* A list, so a reader can be told how many albums this block holds
          and can step through them. The grid still owns the layout. */}
      <ul className="gallery-grid tile-list">
        <li>
          <AlbumTile
            href={albumPath(album.slug)}
            meta={albumMeta(album)}
            src={album.src}
            title={album.title}
            variant="cover"
          />
        </li>
        {album.subAlbums.map((subAlbum) => (
          <li key={subAlbum.slug}>
            <AlbumTile
              href={subAlbumPath(album.slug, subAlbum.slug)}
              meta={`${subAlbum.media.length} archivos`}
              src={subAlbum.src}
              title={subAlbum.title}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
