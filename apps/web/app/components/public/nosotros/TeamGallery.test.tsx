import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { TeamGallery, type TeamGalleryProps } from './TeamGallery'
import { Default, Empty } from './TeamGallery.stories'

const defaultArgs = Default.args as TeamGalleryProps
const emptyArgs = Empty.args as TeamGalleryProps

describe('TeamGallery', () => {
  test('renders one slide per person', () => {
    render(<TeamGallery {...defaultArgs} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(defaultArgs.people.length)
  })

  test('shows each name as visible text', () => {
    render(<TeamGallery {...defaultArgs} />)

    for (const person of defaultArgs.people) {
      expect(screen.getByText(person.name)).toBeInTheDocument()
    }
  })

  test('shows a role only for the people who have one', () => {
    render(<TeamGallery {...defaultArgs} />)

    expect(screen.getByText('Coordinación')).toBeInTheDocument()
    // The third person has no role, so nothing should stand in for it.
    expect(screen.getAllByRole('figure')).toHaveLength(defaultArgs.people.length)
  })

  test('keeps the portraits out of the accessibility tree so names are announced once', () => {
    const { container } = render(<TeamGallery {...defaultArgs} />)

    // The name is already visible in the figcaption beside the portrait, so alt text would
    // make a screen reader read every person twice.
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(defaultArgs.people.length)
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '')
    }
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('exposes the scroll track to the keyboard', () => {
    render(<TeamGallery {...defaultArgs} />)

    // Without this a scrollable region is unreachable by keyboard, which axe flags.
    expect(screen.getByRole('list', { name: defaultArgs.label })).toHaveAttribute('tabindex', '0')
  })

  test('names both scroll controls', () => {
    render(<TeamGallery {...defaultArgs} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveAttribute('type', 'button')
  })

  test('scrolls the track in both directions from the controls', async () => {
    const user = userEvent.setup()
    render(<TeamGallery {...defaultArgs} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    const scrollBy = vi.fn()
    // jsdom implements neither scrollBy nor layout, so both are stubbed here.
    Object.defineProperty(track, 'scrollBy', { value: scrollBy, writable: true })
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 600 })

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: 360 })

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'smooth', left: -360 })
  })

  test('renders nothing while there are no portraits yet', () => {
    const { container } = render(<TeamGallery {...emptyArgs} />)

    expect(container).toBeEmptyDOMElement()
  })
})
