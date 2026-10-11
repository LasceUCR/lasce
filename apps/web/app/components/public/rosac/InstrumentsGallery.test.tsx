import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { rosacInstrumentsContent } from '@/app/lib/rosac-instruments'
import { InstrumentCard } from './InstrumentCard'
import { InstrumentsGallery } from './InstrumentsGallery'

describe('InstrumentsGallery', () => {
  test('renders one slide per instrument item', () => {
    render(
      <InstrumentsGallery label={rosacInstrumentsContent.title}>
        {rosacInstrumentsContent.items.map((item) => (
          <InstrumentCard instrument={item} key={item.id} />
        ))}
      </InstrumentsGallery>,
    )

    const track = screen.getByRole('list', { name: rosacInstrumentsContent.title })
    expect(within(track).getAllByRole('listitem')).toHaveLength(
      rosacInstrumentsContent.items.length,
    )
  })

  test('renders trailing slide when provided', () => {
    render(
      <InstrumentsGallery
        label={rosacInstrumentsContent.title}
        trailingSlide={<button type="button">Añadir instrumento</button>}
      >
        {rosacInstrumentsContent.items.map((item) => (
          <InstrumentCard instrument={item} key={item.id} />
        ))}
      </InstrumentsGallery>,
    )

    expect(screen.getByRole('button', { name: 'Añadir instrumento' })).toBeInTheDocument()
  })

  test('scrolls when previous and next controls are clicked', async () => {
    const user = userEvent.setup()
    render(
      <InstrumentsGallery label={rosacInstrumentsContent.title}>
        {rosacInstrumentsContent.items.map((item) => (
          <InstrumentCard instrument={item} key={item.id} />
        ))}
      </InstrumentsGallery>,
    )

    const prevButton = screen.getByRole('button', { name: 'Anterior' })
    const nextButton = screen.getByRole('button', { name: 'Siguiente' })

    await user.click(nextButton)
    await user.click(prevButton)

    expect(prevButton).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })
})
