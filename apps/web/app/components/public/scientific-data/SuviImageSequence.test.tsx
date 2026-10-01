import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { createElement, type ImgHTMLAttributes } from 'react'

import { SuviImageSequence, type SuviImageSequenceProps } from './SuviImageSequence'
import { Default, UnavailableImage } from './SuviImageSequence.stories'

vi.mock('next/image', () => ({
  default: ({ alt, src, onLoad, onError }: ImgHTMLAttributes<HTMLImageElement>) =>
    createElement('img', { alt, src, onLoad, onError }),
}))

describe('SuviImageSequence', () => {
  test('labels the observed solar image and its UTC capture time', () => {
    render(<SuviImageSequence {...(Default.args as SuviImageSequenceProps)} />)

    expect(screen.getByRole('list', { name: 'Secuencia de imágenes solares' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Imagen solar de demostración/ })).toBeInTheDocument()
    expect(screen.getByText('2026-09-10 08:30 UTC')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando imagen solar')
    fireEvent.load(screen.getByRole('img'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('replaces a failed image with an informative message and recovers on a new band', () => {
    const { rerender } = render(
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
})
