import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { Carousel, type CarouselProps } from './Carousel'
import { CustomLabels, Default } from './Carousel.stories'

const defaultArgs = Default.args as CarouselProps

describe('Carousel', () => {
  test('visits every photograph manually and loops within the selected group', () => {
    render(<Carousel {...defaultArgs} />)
    for (const [index, group] of defaultArgs.groups.entries()) {
      if (index > 0) fireEvent.click(screen.getByRole('button', { name: 'Etapa siguiente' }))
      expect(screen.getByText(group.description)).toBeInTheDocument()
      for (const image of group.images) {
        expect(screen.getByRole('img', { name: image.alt })).toHaveAttribute('src', image.src)
        if (group.images.length > 1)
          fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }))
      }
      expect(screen.getByRole('img', { name: group.images[0].alt })).toBeInTheDocument()
      if (group.images.length > 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Fotografía anterior' }))
        expect(screen.getByRole('img', { name: group.images.at(-1)!.alt })).toBeInTheDocument()
      }
      expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument()
    }
  })

  test('keeps group controls separate, resets photos and disables unavailable groups', () => {
    render(<Carousel {...defaultArgs} />)
    const previous = screen.getByRole('button', { name: 'Etapa anterior' })
    const next = screen.getByRole('button', { name: 'Etapa siguiente' })
    expect(previous).toBeDisabled()
    expect(screen.queryByText(/^Fotografía \d+ de/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }))
    for (const group of defaultArgs.groups.slice(1)) {
      fireEvent.click(next)
      expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: group.images[0].alt })).toBeInTheDocument()
    }
    expect(next).toBeDisabled()
    fireEvent.click(previous)
    expect(screen.getByRole('heading', { name: 'Donación de equipo EATON' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fotografía anterior' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fotografía siguiente' })).not.toBeInTheDocument()
  })

  test('does not advance automatically or expose playback controls', () => {
    vi.useFakeTimers()
    try {
      render(<Carousel {...defaultArgs} />)
      act(() => vi.advanceTimersByTime(60000))
      expect(
        screen.getByRole('img', { name: defaultArgs.groups[0].images[0].alt }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Pausar|Reproducir/ })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  test('supports keyboard activation and announces manually selected photos without moving focus', async () => {
    const user = userEvent.setup()
    render(<Carousel {...defaultArgs} />)
    await user.tab()
    const previous = screen.getByRole('button', { name: 'Fotografía anterior' })
    expect(previous).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(previous).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Fotografía 2 de 2')
    await user.tab()
    const next = screen.getByRole('button', { name: 'Fotografía siguiente' })
    expect(next).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('status')).toHaveTextContent('Fotografía 1 de 2')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Etapa siguiente' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Etapa 2 de 5')
  })

  test('replaces every label and noun when a caller overrides them', () => {
    const customArgs = CustomLabels.args as CarouselProps
    render(<Carousel {...customArgs} />)
    expect(screen.getByRole('button', { name: 'Imagen siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sección siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/^Sección 1 de 5:.*Imagen 1 de 2\.$/)
    expect(screen.queryByRole('button', { name: 'Fotografía siguiente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Etapa siguiente' })).not.toBeInTheDocument()
  })
})
