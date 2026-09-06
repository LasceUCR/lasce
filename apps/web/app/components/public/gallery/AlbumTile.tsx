import Link from 'next/link'

import { MediaFrame } from './MediaFrame'

export type AlbumTileVariant = 'cover' | 'sub'

export interface AlbumTileProps {
  title: string
  /** Secondary line under the title: a summary or a file count. */
  meta: string
  variant?: AlbumTileVariant
  /** Given only when the album has a detail page; otherwise the tile is static. */
  href?: string
  src?: string
}

const placeholders: Record<AlbumTileVariant, string> = {
  cover: 'Portada del álbum',
  sub: 'Portada del subálbum',
}

export function AlbumTile({ title, meta, variant = 'sub', href, src }: AlbumTileProps) {
  const classes = ['gallery-tile', `gallery-tile-${variant}`, href ? '' : 'gallery-tile-static']
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <MediaFrame
        alt={title}
        className="gallery-tile-media"
        placeholder={placeholders[variant]}
        // The grid track is a fixed 260px, so the default 33vw hint would have
        // the browser fetch a much larger candidate than the card can show.
        sizes="(max-width: 600px) 100vw, 260px"
        src={src}
      />
      <div className="gallery-tile-body">
        <strong>{title}</strong>
        <span className="gallery-tile-meta">{meta}</span>
      </div>
    </>
  )

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    )
  }

  return <article className={classes}>{content}</article>
}
