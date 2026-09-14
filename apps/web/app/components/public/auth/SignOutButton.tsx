'use client'

import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'

import { accountMenuCopy, signOutDialogCopy } from '@/app/lib/auth/account'

export interface SignOutButtonProps {
  /** Runs once the person confirms. Not needed when `submitsForm` is set. */
  onSignOut?: () => void
  /**
   * Confirming submits the enclosing form instead of calling `onSignOut`, so
   * the account page's form action keeps working without JavaScript (there
   * the click submits straight away and the dialog never appears).
   */
  submitsForm?: boolean
  isSigningOut?: boolean
  /** Classes of the trigger, so it can look like a header pill or a site button. */
  className?: string
}

/**
 * The "Cerrar sesión" control with its confirmation. The trigger opens a native
 * modal dialog (focus is trapped and Escape cancels for free); only the
 * confirm button ends the session. The dialog is rendered only while open,
 * which keeps it out of the accessibility tree otherwise and lets test
 * environments without `showModal` fall back to the `open` attribute.
 */
export function SignOutButton({
  onSignOut,
  submitsForm = false,
  isSigningOut = false,
  className,
}: SignOutButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const titleId = `${id}-title`
  const bodyId = `${id}-body`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!isOpen || !dialog) return

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    // Escape closes a modal dialog natively; mirror that in state.
    const handleClose = () => setIsOpen(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [isOpen])

  function open(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsOpen(true)
  }

  function close() {
    const dialog = dialogRef.current
    if (dialog && typeof dialog.close === 'function' && dialog.open) dialog.close()
    setIsOpen(false)
  }

  function confirm() {
    close()
    if (submitsForm) {
      triggerRef.current?.form?.requestSubmit()
      return
    }
    onSignOut?.()
  }

  return (
    <>
      <button
        className={className}
        disabled={isSigningOut}
        onClick={open}
        ref={triggerRef}
        type={submitsForm ? 'submit' : 'button'}
      >
        {isSigningOut ? accountMenuCopy.signingOut : accountMenuCopy.signOut}
      </button>

      {isOpen ? (
        <dialog
          aria-describedby={bodyId}
          aria-labelledby={titleId}
          className="confirm-dialog"
          ref={dialogRef}
        >
          <h2 id={titleId}>{signOutDialogCopy.title}</h2>
          <p id={bodyId}>{signOutDialogCopy.body}</p>
          <div className="confirm-dialog-actions">
            <button autoFocus className="button button-secondary" onClick={close} type="button">
              {signOutDialogCopy.cancel}
            </button>
            <button className="button button-brand" onClick={confirm} type="button">
              {signOutDialogCopy.confirm}
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
