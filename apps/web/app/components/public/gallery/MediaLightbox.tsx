'use client'

import { useId } from 'react'

import { Lightbox } from '../Lightbox'
import { MediaFrame } from './MediaFrame'
import type { GalleryMedia } from '@/app/lib/gallery-schema'

function mediaPlaceholder(item: GalleryMedia): string {
  return `${item.isVideo ? 'Video' : 'Foto'}: ${item.title}`
}

export interface MediaLightboxProps {
  albumTitle: string
  item: GalleryMedia
  /** One-based place of `item` in the album, ready to display. */
  position: number
  /** Files the arrows page through, for the "N de M" indicator. */
  total: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

const labels = { close: 'Cerrar', previous: 'Anterior', next: 'Siguiente' }

/**
 * Full-screen view of a single file. The dialog behaviour lives in the shared
 * `Lightbox`; this supplies the stage and the gallery's wording.
 */
export function MediaLightbox({
  albumTitle,
  item,
  position,
  total,
  onClose,
  onPrevious,
  onNext,
}: MediaLightboxProps) {
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`

  return (
    <Lightbox
      announcement={`Archivo ${position} de ${total}: ${item.title}.`}
      describedBy={descriptionId}
      labelledBy={titleId}
      labels={labels}
      onClose={onClose}
      onNext={onNext}
      onPrevious={onPrevious}
      position={position}
      positionLabel={`Archivo ${position} de ${total}`}
      total={total}
    >
      <figure className="lightbox-stage">
        <MediaFrame
          alt={item.alt}
          className="lightbox-media"
          placeholder={mediaPlaceholder(item)}
          sizes="(max-width: 1120px) 100vw, 900px"
          src={item.src}
        />

        <figcaption className="lightbox-meta">
          <span className="lightbox-kicker">{albumTitle}</span>
          <h2 id={titleId}>{item.title}</h2>
          <p id={descriptionId}>{item.description}</p>
          <div className="lightbox-facts">
            <span>{`Fecha de captura: ${item.date}`}</span>
            <span>{`Formato: ${item.format}`}</span>
            <span>{`Subido por: ${item.uploader}`}</span>
          </div>
        </figcaption>
      </figure>
    </Lightbox>
  )
}
