import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

// `TeamGallery.stories` pulls in `rosacInfoContent` from `@/app/lib/rosac`,
// which imports `prisma` at module scope — this stubs it out so loading that
// module for its static fixture doesn't also require a real DATABASE_URL.
vi.mock('@lasce/db', () => ({ prisma: {} }))

import { TeamGallery, type TeamGalleryProps } from './TeamGallery'
import { Default, Empty, PlainName } from './TeamGallery.stories'

const defaultArgs = Default.args as TeamGalleryProps
const emptyArgs = Empty.args as TeamGalleryProps
const plainNameArgs = PlainName.args as TeamGalleryProps

describe('TeamGallery', () => {
  test('renders one slide per person', () => {
    render(<TeamGallery {...defaultArgs} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(defaultArgs.people.length)
  })

  test('starts the track at the first card', () => {
    render(<TeamGallery {...defaultArgs} />)

    expect(screen.getByRole('list', { name: defaultArgs.label })).toHaveProperty('scrollLeft', 0)
  })

  test('tells visitors to click a card for more information', () => {
    render(<TeamGallery {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.hint)).toBeInTheDocument()
  })

  test('shows the role, name, institution and description of every person', async () => {
    const user = userEvent.setup()
    render(<TeamGallery {...defaultArgs} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    for (const person of defaultArgs.people) {
      expect(within(track).getByRole('heading', { name: person.name })).toBeInTheDocument()
      expect(
        within(track).getAllByText(`Institución: ${person.institution}`).length,
      ).toBeGreaterThan(0)
      if (person.description) {
        await user.click(
          within(track).getByRole('button', { name: `Ver descripción de ${person.name}` }),
        )
        expect(within(track).getByText(person.description)).toBeInTheDocument()
        await user.click(
          within(track).getByRole('button', { name: `Volver a la ficha de ${person.name}` }),
        )
      }
    }
  })

  test('links public emails when they were supplied', () => {
    render(<TeamGallery {...defaultArgs} />)

    for (const person of defaultArgs.people) {
      if (!person.email) {
        continue
      }

      expect(screen.getByRole('link', { name: person.email })).toHaveAttribute(
        'href',
        `mailto:${person.email}`,
      )
    }
  })

  test('shows the role each person holds', () => {
    render(<TeamGallery {...defaultArgs} />)

    expect(screen.getByText('Investigadora principal')).toBeInTheDocument()
  })

  test('renders a person who has no academic title', () => {
    render(<TeamGallery {...plainNameArgs} />)

    expect(screen.getByRole('heading', { name: 'Jelmuth Rojas' })).toBeInTheDocument()
    expect(screen.getByText('Colaborador externo')).toBeInTheDocument()
  })

  test('keeps the cards out of the accessibility tree so nothing is announced twice', () => {
    const { container } = render(<TeamGallery {...defaultArgs} />)

    // Every word in the card is already rendered as text beside it, so alt text would repeat
    // each person in full.
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(defaultArgs.people.length)
    defaultArgs.people.forEach((person, index) => {
      expect(images[index]).toHaveAttribute('alt', '')
      expect(images[index]).toHaveAttribute('src', person.src)
    })
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

  test('explains when no researcher information is available', () => {
    render(<TeamGallery {...emptyArgs} />)

    expect(screen.getByRole('status')).toHaveTextContent(emptyArgs.emptyMessage)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(emptyArgs.hint)).not.toBeInTheDocument()
  })

  test('lets a caller override how a person renders, e.g. to wrap it for editing', () => {
    render(
      <TeamGallery {...defaultArgs} renderPerson={(person) => <p>Editable: {person.name}</p>} />,
    )

    for (const person of defaultArgs.people) {
      expect(screen.getByText(`Editable: ${person.name}`)).toBeInTheDocument()
    }
    expect(
      screen.queryByRole('heading', { name: defaultArgs.people[0]!.name }),
    ).not.toBeInTheDocument()
  })

  test('appends a trailing slide after every person', () => {
    render(<TeamGallery {...defaultArgs} trailingSlide={<button type="button">Añadir</button>} />)

    const track = screen.getByRole('list', { name: defaultArgs.label })
    const items = within(track).getAllByRole('listitem')
    expect(items).toHaveLength(defaultArgs.people.length + 1)
    expect(
      within(items[items.length - 1]!).getByRole('button', { name: 'Añadir' }),
    ).toBeInTheDocument()
  })

  test('shows the track with just the trailing slide when there are no people yet', () => {
    render(<TeamGallery {...emptyArgs} trailingSlide={<button type="button">Añadir</button>} />)

    expect(screen.getByRole('status')).toHaveTextContent(emptyArgs.emptyMessage)
    const track = screen.getByRole('list', { name: emptyArgs.label })
    expect(within(track).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument()
  })
})
