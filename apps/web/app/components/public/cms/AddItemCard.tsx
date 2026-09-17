'use client'

import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Modal } from '@/app/components/public/Modal'

export interface AddItemCardHelpers {
  close: () => void
}

export interface AddItemCardProps {
  label: string
  children: (helpers: AddItemCardHelpers) => ReactNode
}

/**
 * A content-agnostic "template card": a prompt to add a new item that opens
 * whatever form the caller passes in in a modal, handing that form a
 * `close()` it can call once it has saved or been cancelled. Knows nothing
 * about news articles (or any other content type) — any form component can
 * be dropped in.
 */
export function AddItemCard({ label, children }: AddItemCardProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button className="add-item-card" onClick={() => setOpen(true)} type="button">
        <Plus aria-hidden="true" size={22} strokeWidth={1.8} />
        {label}
      </button>

      <Modal onClose={close} open={open} title={label}>
        {children({ close })}
      </Modal>
    </>
  )
}
