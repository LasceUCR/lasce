'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

import { MediaFrame } from './MediaFrame'
import { mediaPlaceholder, type GalleryMedia } from '@/app/lib/gallery'

export interface MediaLightboxProps {
  albumTitle: string
  item: GalleryMedia
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

const focusableSelector = 'button:not([tabindex="-1"])'

/**
 * Full-screen view of a single file. Mounted only while open, so the escape and
 * arrow-key handlers live for exactly as long as the dialog does.
 */
export function MediaLightbox({
  albumTitle,
  item,
  onClose,
  onPrevious,
  onNext,
}: MediaLightboxProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowLeft') {
        onPrevious()
        return
      }

      if (event.key === 'ArrowRight') {
        onNext()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      // Keep focus inside the dialog: the page behind it is inert to the reader
      // because of `aria-modal`, so it must be inert to the keyboard too.
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      )
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) {
        return
      }

      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious])

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="lightbox"
      ref={dialogRef}
      role="dialog"
    >
      {/* Click-outside-to-close. Hidden from assistive tech and skipped by the
          keyboard, which reaches the same action through the close button. */}
      <button
        aria-hidden="true"
        className="lightbox-backdrop"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <div className="lightbox-toolbar">
        <button
          aria-label="Cerrar"
          className="lightbox-close"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="lightbox-body">
        <button aria-label="Anterior" className="lightbox-nav" onClick={onPrevious} type="button">
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>

        <div className="lightbox-stage">
          <MediaFrame
            alt={item.title}
            className="lightbox-media"
            placeholder={mediaPlaceholder(item)}
            sizes="(max-width: 1120px) 100vw, 900px"
            src={item.src}
          />

          <div className="lightbox-meta">
            <span className="lightbox-kicker">{albumTitle}</span>
            <h3 id={titleId}>{item.title}</h3>
            <p>{item.description}</p>
            <div className="lightbox-facts">
              <span>{`Fecha de captura: ${item.date}`}</span>
              <span>{`Formato: ${item.format}`}</span>
              <span>{`Subido por: ${item.uploader}`}</span>
            </div>
          </div>
        </div>

        <button aria-label="Siguiente" className="lightbox-nav" onClick={onNext} type="button">
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
