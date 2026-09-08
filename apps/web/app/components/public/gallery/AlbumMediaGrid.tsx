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
      <div className="media-grid">
        {media.map((item, index) => {
          const span = {
            '--media-col-span': item.colSpan,
            '--media-row-span': item.rowSpan,
          } as CSSProperties

          return (
            <div className="media-tile" key={item.id} style={span}>
              <MediaFrame
                alt={item.title}
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

              <div className="media-hover">
                <strong>{item.title}</strong>
                <span className="media-hover-description">{item.description}</span>
                <span className="media-hover-meta">
                  {`${item.date} · ${item.format} · ${item.uploader}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {openItem ? (
        <MediaLightbox
          albumTitle={albumTitle}
          item={openItem}
          onClose={close}
          onNext={showNext}
          onPrevious={showPrevious}
        />
      ) : null}
    </>
  )
}
