'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // The dialog only exists in the DOM while `open` is true (see the early
  // return below), so the `<dialog>` ref is only ever non-null right after
  // this effect re-runs for an `open` that just became true — when it
  // becomes false, the element has already been removed and unmounting
  // cleared the ref, so this safely does nothing. `showModal()` gives it the
  // native backdrop, focus trap and Escape-to-close for free; environments
  // without it (older browsers, jsdom in tests) fall back to a plain `open`
  // attribute.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className="modal"
      onCancel={(event) => {
        // A native file input's own picker can fire a stray `cancel` that
        // bubbles up to the dialog when its Finder/Explorer prompt is
        // dismissed (e.g. from FileDropInput) — that one targets the input,
        // not the dialog, so only react to a `cancel` fired on the dialog
        // itself (a real Escape press while it's the topmost modal).
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
      onClick={(event) => {
        // A click on the backdrop fires with the dialog itself as the
        // target, since the backdrop sits outside the dialog's own box.
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <h2 id={titleId}>{title}</h2>
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
