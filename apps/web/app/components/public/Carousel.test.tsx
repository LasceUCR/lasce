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
    expect(
      screen.getByRole('heading', { name: defaultArgs.groups.at(-2)!.title }),
    ).toBeInTheDocument()
  })

  test('hides photo navigation controls for a group with a single photo', () => {
    const singlePhotoArgs: CarouselProps = {
      ...defaultArgs,
      groups: [
        defaultArgs.groups[0],
        {
          id: 'unica',
          title: 'Etapa única',
          description: 'Descripción de prueba.',
          images: [defaultArgs.groups[0].images[0]],
        },
      ],
    }
    render(<Carousel {...singlePhotoArgs} />)
    fireEvent.click(screen.getByRole('button', { name: 'Etapa siguiente' }))
    expect(screen.getByRole('heading', { name: 'Etapa única' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fotografía anterior' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fotografía siguiente' })).not.toBeInTheDocument()
  })

  test('shows a placeholder for a photo that fails to load, keeping the rest of the carousel usable', () => {
    render(<Carousel {...defaultArgs} />)
    const [firstStage] = defaultArgs.groups
    const firstImage = screen.getByRole('img', { name: firstStage.images[0].alt })

    fireEvent.error(firstImage)

    expect(screen.getByText('No fue posible cargar esta fotografía.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: firstStage.images[0].alt })).not.toBeInTheDocument()
    // The rest of the carousel stays usable: title, description and both levels of navigation.
    expect(screen.getByRole('heading', { name: firstStage.title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }))
    expect(screen.getByRole('img', { name: firstStage.images[1]!.alt })).toBeInTheDocument()
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
    const photoCount = defaultArgs.groups[0].images.length
    expect(screen.getByRole('status')).toHaveTextContent(
      `Fotografía ${photoCount} de ${photoCount}`,
    )
    await user.tab()
    const next = screen.getByRole('button', { name: 'Fotografía siguiente' })
    expect(next).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('status')).toHaveTextContent(`Fotografía 1 de ${photoCount}`)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Etapa siguiente' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(`Etapa 2 de ${defaultArgs.groups.length}`)
  })

  test('replaces every label and noun when a caller overrides them', () => {
    const customArgs = CustomLabels.args as CarouselProps
    render(<Carousel {...customArgs} />)
    expect(screen.getByRole('button', { name: 'Imagen siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sección siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      `Sección 1 de ${customArgs.groups.length}: ${customArgs.groups[0].title}. Imagen 1 de ${customArgs.groups[0].images.length}.`,
    )
    expect(screen.queryByRole('button', { name: 'Fotografía siguiente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Etapa siguiente' })).not.toBeInTheDocument()
  })
})
