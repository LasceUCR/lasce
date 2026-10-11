import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  test('decides itself whether Escape closes it, instead of the browser', () => {
    const onClose = vi.fn()
    render(<Modal {...openArgs} onClose={onClose} />)
    const cancel = new Event('cancel', { cancelable: true })

    screen.getByRole('dialog').dispatchEvent(cancel)

    // Not closed natively: `open` decides, so a parent can keep it open to ask first.
    expect(cancel.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('handles an Escape pressed inside it, and only in the dialog where it was pressed', async () => {
    const user = userEvent.setup()
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    function Nested({ inner }: { inner: boolean }) {
      return (
        <Modal onClose={onOuterClose} open title="Formulario">
          <input aria-label="Título" />
          <Modal onClose={onInnerClose} open={inner} size="small" title="Descartar cambios">
            <button type="button">Seguir editando</button>
          </Modal>
        </Modal>
      )
    }
    const { rerender } = render(<Nested inner={false} />)

    await user.click(screen.getByRole('textbox', { name: 'Título' }))
    await user.keyboard('{Escape}')
    expect(onOuterClose).toHaveBeenCalledTimes(1)

    rerender(<Nested inner />)
    screen.getByRole('button', { name: 'Seguir editando' }).focus()
    await user.keyboard('{Escape}')

    expect(onInnerClose).toHaveBeenCalledTimes(1)
    expect(onOuterClose).toHaveBeenCalledTimes(1)
  })

  test('gives focus back to what had it once it closes', () => {
    function Opener({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Abrir</button>
          <Modal onClose={() => {}} open={open} title="Diálogo">
            <input aria-label="Campo" />
          </Modal>
        </>
      )
    }
    const { rerender } = render(<Opener open={false} />)
    screen.getByRole('button', { name: 'Abrir' }).focus()

    rerender(<Opener open />)
    screen.getByRole('textbox', { name: 'Campo' }).focus()
    rerender(<Opener open={false} />)

    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
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

  /** A dialog by its title, whether or not it is currently shown. */
  function dialogTitled(title: string) {
    const dialog = screen.getByText(title, { selector: 'h2' }).closest('dialog')
    if (!dialog) throw new Error(`No dialog titled ${title}`)
    return dialog
  }

  test('shows only the most recent of two dialogs, and the first again once the second closes', () => {
    function Two({ second }: { second: boolean }) {
      return (
        <>
          <Modal onClose={() => {}} open title="Primero">
            Formulario
          </Modal>
          <Modal onClose={() => {}} open={second} size="small" title="Segundo">
            Confirmación
          </Modal>
        </>
      )
    }
    const { rerender } = render(<Two second={false} />)
    rerender(<Two second />)

    expect(dialogTitled('Primero')).toHaveStyle({ visibility: 'hidden' })
    expect(dialogTitled('Primero')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('dialog', { name: 'Segundo' })).toBeVisible()

    rerender(<Two second={false} />)

    expect(screen.getByRole('dialog', { name: 'Primero' })).toBeVisible()
    expect(dialogTitled('Primero')).not.toHaveAttribute('aria-hidden')
  })

  test('hides a dialog while one opened from inside it is on top, without hiding that one', () => {
    function Nested({ inner }: { inner: boolean }) {
      return (
        <Modal onClose={() => {}} open title="Formulario">
          <p>Lo que se escribió</p>
          <Modal onClose={() => {}} open={inner} size="small" title="Descartar cambios">
            ¿Descartar?
          </Modal>
        </Modal>
      )
    }
    const { rerender } = render(<Nested inner={false} />)
    rerender(<Nested inner />)

    expect(dialogTitled('Formulario')).toHaveStyle({ visibility: 'hidden' })
    expect(screen.getByText('Lo que se escribió')).not.toBeVisible()
    // Not aria-hidden: that would hide the dialog inside it from assistive technology as well.
    expect(dialogTitled('Formulario')).not.toHaveAttribute('aria-hidden')
    // Found by role, so exposed to assistive technology, and shown despite its hidden ancestor
    // (jest-dom's toBeVisible() treats any hidden ancestor as hiding it, which browsers do not).
    expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toHaveStyle({
      visibility: 'visible',
    })

    rerender(<Nested inner={false} />)

    expect(screen.getByRole('dialog', { name: 'Formulario' })).toBeVisible()
    expect(screen.getByText('Lo que se escribió')).toBeVisible()
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
})
