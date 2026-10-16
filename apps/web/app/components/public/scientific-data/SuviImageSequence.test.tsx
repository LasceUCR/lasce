import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { createElement, type ImgHTMLAttributes } from 'react'

import { SuviImageSequence, type SuviImageSequenceProps } from './SuviImageSequence'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { Default, MultipleImages, UnavailableImage } from './SuviImageSequence.stories'

vi.mock('next/image', () => ({
  default: ({ alt, src, onLoad, onError }: ImgHTMLAttributes<HTMLImageElement>) =>
    createElement('img', { alt, src, onLoad, onError }),
}))

describe('SuviImageSequence', () => {
  test('labels the observed solar image and its UTC capture time', () => {
    renderWithIntl(<SuviImageSequence {...(Default.args as SuviImageSequenceProps)} />)

    expect(screen.getByRole('list', { name: 'Secuencia de imágenes solares' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Imagen solar de demostración/ })).toBeInTheDocument()
    expect(screen.getByText('2026-09-10 08:30 UTC')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando imagen solar')
    fireEvent.load(screen.getByRole('img'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('replaces a failed image with an informative message and recovers on a new band', () => {
    const { rerender } = renderWithIntl(
      <SuviImageSequence {...(UnavailableImage.args as SuviImageSequenceProps)} />,
    )
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Esta imagen solar no está disponible')
    expect(screen.getByText('2026-09-10 08:30 UTC')).toBeInTheDocument()

    rerender(<SuviImageSequence {...(Default.args as SuviImageSequenceProps)} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando imagen solar')
  })

  test('opens the image enlarged, named after its capture time', async () => {
    const user = userEvent.setup()
    renderWithIntl(<SuviImageSequence {...(MultipleImages.args as SuviImageSequenceProps)} />)

    await user.click(
      screen.getByRole('button', { name: 'Ampliar imagen solar de 2026-09-10 08:45 UTC' }),
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName('2026-09-10 08:45 UTC')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  test('pages through the sequence with the arrow keys and wraps around', async () => {
    const user = userEvent.setup()
    renderWithIntl(<SuviImageSequence {...(MultipleImages.args as SuviImageSequenceProps)} />)

    await user.click(
      screen.getByRole('button', { name: 'Ampliar imagen solar de 2026-09-10 08:30 UTC' }),
    )
    await user.keyboard('{ArrowLeft}')

    expect(screen.getByRole('dialog')).toHaveAccessibleName('2026-09-10 09:00 UTC')

    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('dialog')).toHaveAccessibleName('2026-09-10 08:30 UTC')
  })

  test('closes the enlarged image and returns focus to its thumbnail', async () => {
    const user = userEvent.setup()
    renderWithIntl(<SuviImageSequence {...(MultipleImages.args as SuviImageSequenceProps)} />)
    const trigger = screen.getByRole('button', {
      name: 'Ampliar imagen solar de 2026-09-10 08:45 UTC',
    })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('offers no enlargement for an image that failed to load', () => {
    renderWithIntl(<SuviImageSequence {...(UnavailableImage.args as SuviImageSequenceProps)} />)

    expect(screen.getByRole('button', { name: /Ampliar imagen solar/ })).toBeInTheDocument()

    fireEvent.error(screen.getByRole('img'))

    expect(screen.queryByRole('button', { name: /Ampliar imagen solar/ })).not.toBeInTheDocument()
  })
})
