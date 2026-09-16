import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ConstructionCarousel, type ConstructionCarouselProps } from './ConstructionCarousel'
import { Default } from './ConstructionCarousel.stories'

const defaultArgs = Default.args as ConstructionCarouselProps

describe('ConstructionCarousel', () => {
  test('visits all fifteen photographs manually and loops within the selected stage', () => {
    render(<ConstructionCarousel {...defaultArgs} />)
    for (const [index, stage] of defaultArgs.stages.entries()) {
      if (index > 0) fireEvent.click(screen.getByRole('button', { name: 'Etapa siguiente' }))
      expect(screen.getByText(stage.description)).toBeInTheDocument()
      for (const image of stage.images) {
        expect(screen.getByRole('img', { name: image.alt })).toHaveAttribute('src', image.src)
        if (stage.images.length > 1)
          fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }))
      }
      expect(screen.getByRole('img', { name: stage.images[0].alt })).toBeInTheDocument()
      if (stage.images.length > 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Fotografía anterior' }))
        expect(screen.getByRole('img', { name: stage.images.at(-1)!.alt })).toBeInTheDocument()
      }
      expect(screen.getByRole('heading', { name: stage.title })).toBeInTheDocument()
    }
  })

  test('keeps stage controls separate, resets photos and disables unavailable stages', () => {
    render(<ConstructionCarousel {...defaultArgs} />)
    const previous = screen.getByRole('button', { name: 'Etapa anterior' })
    const next = screen.getByRole('button', { name: 'Etapa siguiente' })
    expect(previous).toBeDisabled()
    expect(
      screen.queryByRole('group', { name: 'Elegir etapa de construcción' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/^Fotografía \d+ de/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }))
    for (const stage of defaultArgs.stages.slice(1)) {
      fireEvent.click(next)
      expect(screen.getByRole('heading', { name: stage.title })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: stage.images[0].alt })).toBeInTheDocument()
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
      render(<ConstructionCarousel {...defaultArgs} />)
      act(() => vi.advanceTimersByTime(60000))
      expect(
        screen.getByRole('img', { name: defaultArgs.stages[0].images[0].alt }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Pausar|Reproducir/ })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  test('supports keyboard activation and announces manually selected photos without moving focus', async () => {
    const user = userEvent.setup()
    render(<ConstructionCarousel {...defaultArgs} />)
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
})
