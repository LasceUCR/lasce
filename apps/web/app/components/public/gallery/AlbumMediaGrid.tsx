'use client'

import { Play } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { MediaFrame } from './MediaFrame'
import { MediaLightbox } from './MediaLightbox'
import { mediaPlaceholder, type GalleryMedia } from '@/app/lib/gallery'

export interface AlbumMediaGridProps {
  albumTitle: string
  media: readonly GalleryMedia[]
}

const closed = -1

/**
 * The album's masonry grid. Owns the lightbox index, so the grid and the dialog
 * agree on which file is open and focus can return to the tile that opened it.
 */
export function AlbumMediaGrid({ albumTitle, media }: AlbumMediaGridProps) {
  const [openIndex, setOpenIndex] = useState(closed)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])

  const close = useCallback(() => {
    // The dialog closes itself natively before this runs, so the document is no
    // longer inert and the tile can take focus back.
    triggers.current[openIndex]?.focus()
    setOpenIndex(closed)
  }, [openIndex])

  const showPrevious = useCallback(() => {
    setOpenIndex((current) => (current - 1 + media.length) % media.length)
  }, [media.length])

  const showNext = useCallback(() => {
    setOpenIndex((current) => (current + 1) % media.length)
  }, [media.length])

  const openItem = openIndex === closed ? null : media[openIndex]

  return (
    <>
      <ul className="media-grid tile-list">
        {media.map((item, index) => {
          const span = {
            '--media-col-span': item.colSpan,
            '--media-row-span': item.rowSpan,
          } as CSSProperties

          return (
            <li className="media-tile" key={item.id} style={span}>
              {/* Decorative: the button below names the file, and the caption
                  repeats it as real text. The photograph's own description
                  belongs to the lightbox, where the image is the content. */}
              <MediaFrame
                alt=""
                className="media-tile-frame"
                placeholder={mediaPlaceholder(item)}
                src={item.src}
              />

              <button
                aria-label={`Ver a tamaño completo: ${item.title}`}
                className="media-tile-button"
                onClick={() => setOpenIndex(index)}
                ref={(element) => {
                  triggers.current[index] = element
                }}
                type="button"
              />

              {item.isVideo ? (
                <span className="play-badge">
                  <Play aria-hidden="true" size={16} strokeWidth={1.8} />
                  <span className="sr-only">Video</span>
                </span>
              ) : null}

              <div className="media-overlay">
                <span className="media-chip">{`${item.date} · ${item.format}`}</span>
              </div>

              {/* Not a `figcaption`: this panel is `opacity: 0` until the tile
                  is hovered or focused, so it is a reveal rather than a caption
                  the image always carries. */}
              <div className="media-hover">
                <p className="media-hover-title">{item.title}</p>
                <span className="media-hover-description">{item.description}</span>
                <span className="media-hover-meta">
                  {`${item.date} · ${item.format} · ${item.uploader}`}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {openItem ? (
        <MediaLightbox
          albumTitle={albumTitle}
          item={openItem}
          onClose={close}
          onNext={showNext}
          onPrevious={showPrevious}
          position={openIndex + 1}
          total={media.length}
        />
      ) : null}
    </>
  )
}
