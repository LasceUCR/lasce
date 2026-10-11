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

  test('defaults to the medium size when none is given', () => {
    render(<Modal {...openArgs} />)

    expect(screen.getByRole('dialog')).toHaveClass('modal-medium')
  })

  test.each(['small', 'medium', 'large'] as const)('applies the %s size class', (size) => {
    render(<Modal {...openArgs} size={size} />)

    expect(screen.getByRole('dialog')).toHaveClass(`modal-${size}`)
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

  test('closes when the press and the click both land on the backdrop', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')

    dialog.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not close when a text selection started inside the content ends past its edge', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    const body = dialog.querySelector('.modal-body')
    if (!body) throw new Error('Modal body not found')

    // The drag starts inside the content...
    body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    // ...but the browser still fires `click` with the dialog as its target,
    // because the mouse was released past the content's edge while still
    // inside the dialog's own box — indistinguishable from a real backdrop
    // click by target alone.
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClose).not.toHaveBeenCalled()
  })

  test('hides lower dialogs in the stack when a new modal opens, and restores them when it closes', () => {
    function StackTestComponent({ showSecond }: { showSecond: boolean }) {
      return (
        <>
          <Modal onClose={vi.fn()} open={true} title="First Modal">
            <p>First content</p>
          </Modal>
          {showSecond ? (
            <Modal onClose={vi.fn()} open={true} title="Second Modal">
              <p>Second content</p>
            </Modal>
          ) : null}
        </>
      )
    }

    const { rerender } = render(<StackTestComponent showSecond={false} />)
    const firstDialog = screen.getByRole('dialog', { name: 'First Modal' })
    expect(firstDialog.style.visibility).toBe('')
    expect(firstDialog).not.toHaveAttribute('aria-hidden')

    rerender(<StackTestComponent showSecond={true} />)
    const secondDialog = screen.getByRole('dialog', { name: 'Second Modal' })
    expect(secondDialog.style.visibility).toBe('')
    expect(firstDialog.style.visibility).toBe('hidden')
    expect(firstDialog).toHaveAttribute('aria-hidden', 'true')

    rerender(<StackTestComponent showSecond={false} />)
    expect(firstDialog.style.visibility).toBe('')
    expect(firstDialog).not.toHaveAttribute('aria-hidden')
  })

  test('hides parent dialog when a nested modal (like confirmation dialog) opens inside its children', () => {
    function NestedTestComponent({ showConfirm }: { showConfirm: boolean }) {
      return (
        <Modal onClose={vi.fn()} open={true} title="Form Modal">
          <p>Form fields</p>
          {showConfirm ? (
            <Modal onClose={vi.fn()} open={true} size="small" title="Confirm Dialog">
              <p>Confirm action</p>
            </Modal>
          ) : null}
        </Modal>
      )
    }

    const { rerender } = render(<NestedTestComponent showConfirm={false} />)
    const formDialog = screen.getByRole('dialog', { name: 'Form Modal' })
    expect(formDialog.style.visibility).toBe('')

    rerender(<NestedTestComponent showConfirm={true} />)
    const confirmDialog = screen.getByRole('dialog', { name: 'Confirm Dialog' })
    expect(confirmDialog.style.visibility).toBe('')
    expect(formDialog.style.visibility).toBe('hidden')
    expect(formDialog).toHaveAttribute('aria-hidden', 'true')

    rerender(<NestedTestComponent showConfirm={false} />)
    expect(formDialog.style.visibility).toBe('')
    expect(formDialog).not.toHaveAttribute('aria-hidden')
  })
})
