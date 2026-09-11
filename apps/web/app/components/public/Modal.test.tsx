import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { Modal, type ModalProps } from './Modal'
import { Open } from './Modal.stories'

const openArgs = Open.args as ModalProps

describe('Modal', () => {
  test('renders its title and content when open', () => {
    render(<Modal {...openArgs} />)

    expect(screen.getByRole('dialog', { name: openArgs.title })).toBeInTheDocument()
  })

  test('renders nothing when closed', () => {
    render(<Modal {...openArgs} open={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('calls onClose when the native close event fires', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)

    screen.getByRole('dialog').dispatchEvent(new Event('close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when the dialog itself is cancelled (Escape)', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)

    screen.getByRole('dialog').dispatchEvent(new Event('cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('ignores a cancel event bubbling up from a nested control, like a file input’s picker being dismissed', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)

    // HTMLInputElement's own `cancel` event (fired when a file picker is
    // dismissed with no selection) bubbles, per spec, and would otherwise be
    // mistaken by the dialog's `cancel` listener for an Escape press.
    screen
      .getByText('¿Está seguro de que desea eliminar esta noticia?')
      .dispatchEvent(new Event('cancel', { bubbles: true }))

    expect(onClose).not.toHaveBeenCalled()
  })
})
