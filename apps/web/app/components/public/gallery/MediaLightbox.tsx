'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'

import { MediaFrame } from './MediaFrame'
import { mediaPlaceholder, type GalleryMedia } from '@/app/lib/gallery'

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

/**
 * Full-screen view of a single file, as a native modal dialog. `showModal()`
 * provides the focus trap, Escape, and an inert background, so none of that is
 * hand-rolled here; only the arrow-key paging is ours. Mounted just while open,
 * so the listeners live for exactly as long as the dialog does.
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const hasPaged = useRef(false)

  // `onClose` changes identity as the open index moves, so hold it in a ref and
  // keep the setup below to mount and unmount.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      // jsdom, and anything without the top layer: the dialog still renders and
      // still closes, it just is not modal.
      dialog.setAttribute('open', '')
    }

    // `showModal()` blocks scrolling on its own, but the fallback above does
    // not, so lock it explicitly and release it on unmount.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleClose)

    return () => {
      dialog.removeEventListener('close', handleClose)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // A live region announces its content on mount as well as on change, and this
  // dialog mounts only when it opens — so staying empty until the file actually
  // changes keeps it from talking over the dialog's own name and description.
  useEffect(() => {
    if (!hasPaged.current) {
      hasPaged.current = true
      return
    }

    setAnnouncement(`Archivo ${position} de ${total}: ${item.title}.`)
  }, [item.title, position, total])

  function closeDialog() {
    const dialog = dialogRef.current

    // Closing natively restores focus to the tile that opened this, and fires
    // the `close` event the effect above listens for. jsdom implements neither
    // `showModal` nor `close`, so fall back to reporting it upwards.
    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close()
      return
    }

    onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowLeft') {
      onPrevious()
      return
    }

    if (event.key === 'ArrowRight') {
      onNext()
      return
    }

    // Escape closes a modal dialog natively; this covers the fallback path.
    if (event.key === 'Escape') {
      closeDialog()
    }
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // Click outside to close: the backdrop is painted by `::backdrop`, so a
    // click that lands on the dialog itself is a click beside the content.
    if (event.target === dialogRef.current) {
      closeDialog()
    }
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="lightbox"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className="lightbox-toolbar">
        <p className="lightbox-position">
          <span aria-hidden="true">{`${position} / ${total}`}</span>
          <span className="sr-only">{`Archivo ${position} de ${total}`}</span>
        </p>

        <button
          aria-label="Cerrar"
          autoFocus
          className="lightbox-close"
          onClick={closeDialog}
          type="button"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="lightbox-body">
        <button aria-label="Anterior" className="lightbox-nav" onClick={onPrevious} type="button">
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>

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

        <button aria-label="Siguiente" className="lightbox-nav" onClick={onNext} type="button">
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </div>

      {/* Outside the figure, so it can never leak into its accessible name. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </dialog>
  )
}
