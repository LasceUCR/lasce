import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Lightbox, type LightboxProps } from './Lightbox'
import { Default } from './Lightbox.stories'

const args = Default.args as LightboxProps

function renderLightbox(overrides: Partial<LightboxProps> = {}) {
  const handlers = { onClose: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
  const view = render(<Lightbox {...args} {...handlers} {...overrides} />)

  return { ...handlers, ...view }
}

// jsdom implements `close()` and the `open` attribute but not `showModal`, so
// the component's fallback path is what runs unless it is stubbed. Stub it here
// so the modal path is the one under test, as it is in a browser.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('Lightbox', () => {
  test('opens itself as a modal dialog named and described by its content', () => {
    renderLightbox()

    const dialog = screen.getByRole('dialog')

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    expect(dialog).toHaveAccessibleName('Segundo')
    expect(dialog).toHaveAccessibleDescription('Contenido de ejemplo del visor.')
  })

  test('places the open item among the others', () => {
    renderLightbox({ position: 2, total: 13, positionLabel: 'Elemento 2 de 13' })

    expect(screen.getByText('2 / 13')).toBeInTheDocument()
    expect(screen.getByText('Elemento 2 de 13')).toBeInTheDocument()
  })

  test('moves focus to the close control when it opens', () => {
    renderLightbox()

    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
  })

  test('closes on Escape and on the close control', async () => {
    const user = userEvent.setup()
    const { onClose } = renderLightbox()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test('pages with the arrow keys', async () => {
    const user = userEvent.setup()
    const { onPrevious, onNext } = renderLightbox()

    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowRight}')

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  test('keeps handled keys from reaching a parent key handler', async () => {
    const user = userEvent.setup()
    const onParentKeyDown = vi.fn()
    render(
      <div onKeyDown={onParentKeyDown}>
        <Lightbox {...args} onClose={vi.fn()} onNext={vi.fn()} onPrevious={vi.fn()} />
      </div>,
    )

    await user.keyboard('{ArrowLeft}{ArrowRight}{Escape}')

    expect(onParentKeyDown).not.toHaveBeenCalled()
  })

  test('pages with the previous and next controls', async () => {
    const user = userEvent.setup()
    const { onPrevious, onNext } = renderLightbox()

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  // A live region that arrives already populated is read out on top of the
  // dialog's own name, so it has to start empty.
  test('says nothing about the item it was opened on', () => {
    renderLightbox()

    expect(screen.queryByText(args.announcement)).not.toBeInTheDocument()
  })

  test('announces the item only once it has changed', async () => {
    const { rerender } = renderLightbox()

    rerender(
      <Lightbox
        {...args}
        announcement="Elemento 3 de 5: Tercero."
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        position={3}
      />,
    )

    expect(await screen.findByText('Elemento 3 de 5: Tercero.')).toBeInTheDocument()
  })

  test('locks the page behind it from scrolling, and releases it on close', () => {
    const { unmount } = renderLightbox()

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  // The paths a real browser takes, which jsdom does not implement: closing
  // natively fires `close`, and that is what reports the dismissal upwards.
  test('closes itself natively when the browser supports it', async () => {
    const close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    })
    HTMLDialogElement.prototype.close = close

    const user = userEvent.setup()
    const { onClose } = renderLightbox()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(close).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('closes when the area beside the content is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderLightbox()

    await user.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('keeps the content clickable without closing', async () => {
    const user = userEvent.setup()
    const { onClose } = renderLightbox()

    await user.click(screen.getByRole('heading', { level: 2 }))

    expect(onClose).not.toHaveBeenCalled()
  })

  test('still renders where the top layer is unavailable', () => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')

    renderLightbox()

    expect(screen.getByRole('dialog')).toHaveAttribute('open')
  })
})
