import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { MediaLightbox, type MediaLightboxProps } from './MediaLightbox'
import { Photograph, Video } from './MediaLightbox.stories'

const photographArgs = Photograph.args as MediaLightboxProps
const videoArgs = Video.args as MediaLightboxProps

function renderLightbox(overrides: Partial<MediaLightboxProps> = {}) {
  const handlers = { onClose: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }
  render(<MediaLightbox {...photographArgs} {...handlers} {...overrides} />)

  return handlers
}

describe('MediaLightbox', () => {
  test('presents itself as a modal dialog named after the file', () => {
    renderLightbox()

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveAccessibleName(photographArgs.item.title)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  test('shows the album, the description and the capture details', () => {
    renderLightbox()

    expect(screen.getByText(photographArgs.albumTitle)).toBeInTheDocument()
    expect(screen.getByText(photographArgs.item.description)).toBeInTheDocument()
    expect(screen.getByText('Fecha de captura: 15 ene 2025')).toBeInTheDocument()
    expect(screen.getByText('Formato: JPG')).toBeInTheDocument()
    expect(screen.getByText('Subido por: Andrés Solano')).toBeInTheDocument()
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

  test('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderLightbox()

    const close = screen.getByRole('button', { name: 'Cerrar' })
    const next = screen.getByRole('button', { name: 'Siguiente' })

    await user.tab({ shift: true })
    expect(next).toHaveFocus()

    await user.tab()
    expect(close).toHaveFocus()
  })

  test('describes a video placeholder as video', () => {
    renderLightbox({ item: videoArgs.item })

    expect(screen.getByText('Video: Ensamblaje del reflector parabólico')).toBeInTheDocument()
  })
})
