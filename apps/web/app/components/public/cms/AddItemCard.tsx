'use client'

import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Modal, type ModalSize } from '@/app/components/public/Modal'

export interface AddItemCardHelpers {
  close: () => void
}

export interface AddItemCardProps {
  label: string
  children: (helpers: AddItemCardHelpers) => ReactNode
  /** Forwarded to the modal wrapping `children`. Defaults to `Modal`'s own default. */
  size?: ModalSize
  /**
   * Called instead of closing when the modal's close button, Escape or backdrop is used, so the
   * form inside can ask before discarding what was typed. It calls `close` to actually close.
   * Without it, those close the modal straight away.
   */
  onRequestClose?: (close: () => void) => void
}

/**
 * A content-agnostic "template card": a prompt to add a new item that opens
 * whatever form the caller passes in in a modal, handing that form a
 * `close()` it can call once it has saved or been cancelled. Knows nothing
 * about news articles (or any other content type) — any form component can
 * be dropped in.
 */
export function AddItemCard({ label, children, size, onRequestClose }: AddItemCardProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="add-item-card"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus aria-hidden="true" size={22} strokeWidth={1.8} />
        {label}
      </button>

      <Modal
        onClose={onRequestClose ? () => onRequestClose(close) : close}
        open={open}
        size={size}
        title={label}
      >
        {children({ close })}
      </Modal>
    </>
  )
}
