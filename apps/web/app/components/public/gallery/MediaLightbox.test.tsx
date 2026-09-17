import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { MediaLightbox, type MediaLightboxProps } from './MediaLightbox'
import { Photograph, Video } from './MediaLightbox.stories'

const photographArgs = Photograph.args as MediaLightboxProps
const videoArgs = Video.args as MediaLightboxProps

function renderLightbox(overrides: Partial<MediaLightboxProps> = {}) {
  const handlers = { onClose: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
  const view = render(<MediaLightbox {...photographArgs} {...handlers} {...overrides} />)

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

describe('MediaLightbox', () => {
  test('opens itself as a modal dialog named after the file', () => {
    renderLightbox()

    const dialog = screen.getByRole('dialog')

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    expect(dialog).toHaveAccessibleName(photographArgs.item.title)
  })

  test('describes itself with the caption of the open file', () => {
    renderLightbox()

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(photographArgs.item.description)
  })

  test('describes the photograph itself rather than repeating its title', () => {
    renderLightbox()

    expect(screen.getByRole('img', { name: photographArgs.item.alt })).toBeInTheDocument()
    expect(photographArgs.item.alt).not.toBe(photographArgs.item.title)
  })

  test('shows the album, the description and the capture details', () => {
    renderLightbox()

    expect(screen.getByText(photographArgs.albumTitle)).toBeInTheDocument()
    expect(screen.getByText(photographArgs.item.description)).toBeInTheDocument()
    expect(screen.getByText('Fecha de captura: 15 ene 2025')).toBeInTheDocument()
    expect(screen.getByText('Formato: JPG')).toBeInTheDocument()
    expect(screen.getByText('Subido por: Andrés Solano')).toBeInTheDocument()
  })

  test('titles the open file as the heading of the dialog', () => {
    renderLightbox()

    expect(
      screen.getByRole('heading', { level: 2, name: photographArgs.item.title }),
    ).toBeInTheDocument()
  })

  test('places the open file within the album', () => {
    renderLightbox({ position: 2, total: 13 })

    expect(screen.getByText('2 / 13')).toBeInTheDocument()
    expect(screen.getByText('Archivo 2 de 13')).toBeInTheDocument()
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

    expect(onClose).toHaveBeenCalled()
  })

  test('pages through the album with the arrow keys', async () => {
    const user = userEvent.setup()
    const { onPrevious, onNext } = renderLightbox()

    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowRight}')

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  test('pages through the album with the previous and next controls', async () => {
    const user = userEvent.setup()
    const { onPrevious, onNext } = renderLightbox()

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  // A live region that arrives already populated is read out on top of the
  // dialog's own name, so it has to start empty.
  test('says nothing about the file it was opened on', () => {
    renderLightbox()

    expect(
      screen.queryByText(`Archivo 1 de 13: ${photographArgs.item.title}.`),
    ).not.toBeInTheDocument()
  })

  test('announces the file only once it has been paged', async () => {
    const { rerender } = renderLightbox()

    rerender(
      <MediaLightbox
        {...photographArgs}
        item={videoArgs.item}
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        position={2}
      />,
    )

    expect(await screen.findByText(`Archivo 2 de 13: ${videoArgs.item.title}.`)).toBeInTheDocument()
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

  test('shows the still and the details of a video entry', () => {
    renderLightbox({ item: videoArgs.item })

    expect(screen.getByRole('img', { name: videoArgs.item.alt })).toBeInTheDocument()
    expect(screen.getByText('Formato: MP4')).toBeInTheDocument()
  })

  test('falls back to a caption when the file has no image yet', () => {
    renderLightbox({ item: { ...videoArgs.item, src: undefined } })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Video: Ensamblaje del reflector parabólico')).toBeInTheDocument()
  })
})
