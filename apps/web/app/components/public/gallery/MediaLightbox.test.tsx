import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'
import { MediaLightbox, type MediaLightboxProps } from './MediaLightbox'
import { Photograph, Video } from './MediaLightbox.stories'

const photographArgs = Photograph.args as MediaLightboxProps
const videoArgs = Video.args as MediaLightboxProps

function renderLightbox(overrides: Partial<MediaLightboxProps> = {}) {
  const handlers = { onClose: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
  const view = renderWithIntl(<MediaLightbox {...photographArgs} {...handlers} {...overrides} />)

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
    expect(screen.getByText(`Fecha de captura: ${photographArgs.item.date}`)).toBeInTheDocument()
    expect(screen.getByText(`Formato: ${photographArgs.item.format}`)).toBeInTheDocument()
    expect(screen.getByText(`Subido por: ${photographArgs.item.uploader}`)).toBeInTheDocument()
  })

  test('keeps the Spanish names of its controls', () => {
    renderLightbox()

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
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

    expect(
      await screen.findByText(`Archivo 2 de ${videoArgs.total}: ${videoArgs.item.title}.`),
    ).toBeInTheDocument()
  })

  test('shows the still and the details of a video entry', () => {
    renderLightbox({ item: videoArgs.item })

    expect(screen.getByRole('img', { name: videoArgs.item.alt })).toBeInTheDocument()
    expect(screen.getByText(`Formato: ${videoArgs.item.format}`)).toBeInTheDocument()
  })

  test('falls back to a caption when the file has no image yet', () => {
    renderLightbox({ item: { ...videoArgs.item, src: undefined } })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(`Video: ${videoArgs.item.title}`)).toBeInTheDocument()
  })
})
