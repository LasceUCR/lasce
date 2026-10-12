'use client'

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { ToastOutlet } from '@/app/components/public/toast/ToastOutlet'

export type ModalSize = 'small' | 'medium' | 'large'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Small: confirmation dialogs. Medium (default): most forms. Large: wide, multi-column forms. */
  size?: ModalSize
}

const modalStack: HTMLDialogElement[] = []

const HeaderSlotContext = createContext<HTMLElement | null>(null)

/**
 * The element beside the modal's title, for a control that belongs to the whole dialog rather
 * than to one field, such as an editor's language tabs: render it there with `createPortal`.
 * It stays in view while the content below scrolls. `null` outside a modal, or before the modal
 * has rendered, so the caller can fall back to rendering the control in place.
 */
export function useModalHeaderSlot(): HTMLElement | null {
  return useContext(HeaderSlotContext)
}

/**
 * Only the most recent dialog is shown: popups never sit on top of each other. Every dialog below
 * it is hidden until it is the most recent again, keeping whatever was typed in it.
 *
 * A dialog opened from inside another one (a confirmation rendered by a form, say) is that
 * dialog's descendant, and `visibility` is inherited, so the top dialog is set back to `visible`
 * explicitly. Such an ancestor is not given `aria-hidden`, which a descendant cannot undo and
 * would hide the top dialog from assistive technology too; `showModal()` already makes it inert.
 */
function updateModalStackVisibility() {
  const top = modalStack[modalStack.length - 1]
  for (const dialog of modalStack) {
    if (dialog === top) {
      dialog.style.visibility = modalStack.some((other) => other !== top && other.contains(top))
        ? 'visible'
        : ''
      dialog.removeAttribute('aria-hidden')
    } else if (top && dialog.contains(top)) {
      dialog.style.visibility = 'hidden'
      dialog.removeAttribute('aria-hidden')
    } else {
      dialog.style.visibility = 'hidden'
      dialog.setAttribute('aria-hidden', 'true')
    }
  }
}

/** The page's own styles from before the first dialog locked its scrolling. */
let pageScrollLock: { overflow: string; paddingRight: string } | null = null

/**
 * The page behind an open dialog does not scroll: wheel, touch and keys only move the dialog's
 * content. `showModal()` makes the page inert but still lets it scroll, so the page is locked
 * while any dialog is open and released once the last one closes. The scrollbar's width is kept
 * as padding, so the page does not shift sideways when its scrollbar disappears.
 */
function updatePageScrollLock() {
  const { body } = document

  if (modalStack.length > 0 && !pageScrollLock) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    pageScrollLock = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const padding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${padding + scrollbarWidth}px`
    }
  } else if (modalStack.length === 0 && pageScrollLock) {
    body.style.overflow = pageScrollLock.overflow
    body.style.paddingRight = pageScrollLock.paddingRight
    pageScrollLock = null
  }
}

export function Modal({ open, title, onClose, children, size = 'medium' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Tracks whether the current press-drag-release started on the backdrop
  // itself, not just where it ended. Selecting text inside `.modal-body` and
  // releasing the mouse past its edge (still inside the dialog's own box)
  // fires `click` with the dialog as its target too — identical to a real
  // backdrop click — so target alone can't tell them apart. Requiring the
  // press to have started on the backdrop as well does.
  const pressStartedOnBackdrop = useRef(false)
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null)

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

    // Where focus goes back to once this dialog closes, as a native `close()` would do. Without
    // it, closing a confirmation leaves focus on the page's body instead of in the form below.
    const opener = document.activeElement

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    if (!modalStack.includes(dialog)) {
      modalStack.push(dialog)
    }
    updateModalStackVisibility()
    updatePageScrollLock()

    return () => {
      const index = modalStack.indexOf(dialog)
      if (index !== -1) {
        modalStack.splice(index, 1)
      }
      dialog.style.visibility = ''
      dialog.removeAttribute('aria-hidden')
      updateModalStackVisibility()
      updatePageScrollLock()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) {
    return null
  }

  const dialog = (
    <dialog
      aria-labelledby={titleId}
      className={`modal modal-${size}`}
      onCancel={(event) => {
        // A native file input's own picker can fire a stray `cancel` that
        // bubbles up to the dialog when its Finder/Explorer prompt is
        // dismissed (e.g. from FileDropInput) — that one targets the input,
        // not the dialog, so only react to a `cancel` fired on the dialog
        // itself (a real Escape press while it's the topmost modal).
        if (event.target === dialogRef.current) {
          // `open` decides whether the dialog is shown, not the browser: `onClose` may keep it
          // open, to ask before discarding changes, and a natively closed dialog would vanish.
          event.preventDefault()
          onClose()
        }
      }}
      onKeyDown={(event) => {
        // Escape is handled here rather than left to the browser, which only lets `cancel` be
        // prevented after a fresh user interaction: a second Escape would close the dialog
        // natively even when `onClose` keeps it open. Only the dialog the key was pressed in
        // reacts; a dialog opened inside this one handles its own Escape first.
        if (event.key !== 'Escape' || event.defaultPrevented) return
        if (!(event.target instanceof Element)) return
        if (event.target.closest('dialog') !== dialogRef.current) return
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the backdrop fires with the dialog itself as the
        // target, since the backdrop sits outside the dialog's own box. Only
        // close when the press also started there — see `pressStartedOnBackdrop`.
        if (event.target === dialogRef.current && pressStartedOnBackdrop.current) {
          onClose()
        }
      }}
      onClose={onClose}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === dialogRef.current
      }}
      ref={dialogRef}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <div className="modal-header-slot" ref={setHeaderSlot} />
      </div>
      <div className="modal-body">
        <HeaderSlotContext value={headerSlot}>{children}</HeaderSlotContext>
      </div>
      {/* Toasts must stay inside the active dialog to remain accessible. */}
      <ToastOutlet />
    </dialog>
  )

  if (typeof document !== 'undefined') {
    return createPortal(dialog, document.body)
  }

  return dialog
}
