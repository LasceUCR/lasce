'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

export interface LightboxLabels {
  close: string
  previous: string
  next: string
}

export interface LightboxProps {
  /** Id of the heading inside `children` that names the dialog. */
  labelledBy: string
  /** Id of the element inside `children` that describes the dialog. */
  describedBy: string
  /** One-based place of the open item, ready to display. */
  position: number
  /** Items the arrows page through, for the "N / M" indicator. */
  total: number
  /** Screen-reader text for the position, e.g. "Archivo 2 de 5". */
  positionLabel: string
  /** Text announced after paging. Stays silent until it changes. */
  announcement: string
  labels: LightboxLabels
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  /** The stage: a `<figure className="lightbox-stage">`. */
  children: ReactNode
}

/**
 * Full-screen shell for paging through items, as a native modal dialog. `showModal()`
 * provides the focus trap, Escape, and an inert background, so none of that is
 * hand-rolled here; only the arrow-key paging is ours. Mounted just while open,
 * so the listeners live for exactly as long as the dialog does. All copy arrives
 * through props, so each caller keeps its own language and wording.
 */
export function Lightbox({
  labelledBy,
  describedBy,
  position,
  total,
  positionLabel,
  announcement: nextAnnouncement,
  labels,
  onClose,
  onPrevious,
  onNext,
  children,
}: LightboxProps) {
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
  // dialog mounts only when it opens — so staying empty until the item actually
  // changes keeps it from talking over the dialog's own name and description.
  useEffect(() => {
    if (!hasPaged.current) {
      hasPaged.current = true
      return
    }

    setAnnouncement(nextAnnouncement)
  }, [nextAnnouncement])

  function closeDialog() {
    const dialog = dialogRef.current

    // Closing natively restores focus to the element that opened this, and fires
    // the `close` event the effect above listens for. jsdom implements neither
    // `showModal` nor `close`, so fall back to reporting it upwards.
    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close()
      return
    }

    onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // React events bubble through the component tree, so a handler on whatever
    // rendered this dialog (a scrolling strip, say) would also see these keys.
    if (event.key === 'ArrowLeft') {
      event.stopPropagation()
      onPrevious()
      return
    }

    if (event.key === 'ArrowRight') {
      event.stopPropagation()
      onNext()
      return
    }

    // Escape closes a modal dialog natively; this covers the fallback path.
    if (event.key === 'Escape') {
      event.stopPropagation()
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
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className="lightbox"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className="lightbox-toolbar">
        <p className="lightbox-position">
          <span aria-hidden="true">{`${position} / ${total}`}</span>
          <span className="sr-only">{positionLabel}</span>
        </p>

        <button
          aria-label={labels.close}
          autoFocus
          className="lightbox-close"
          onClick={closeDialog}
          type="button"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="lightbox-body">
        <button
          aria-label={labels.previous}
          className="lightbox-nav"
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>

        {children}

        <button aria-label={labels.next} className="lightbox-nav" onClick={onNext} type="button">
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
