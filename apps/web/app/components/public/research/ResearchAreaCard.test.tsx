import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ResearchAreaCard, type ResearchAreaCardProps } from './ResearchAreaCard'
import { Default, LongDescription, WithoutImage } from './ResearchAreaCard.stories'

const defaultArgs = Default.args as ResearchAreaCardProps
const withoutImageArgs = WithoutImage.args as ResearchAreaCardProps
const longArgs = LongDescription.args as ResearchAreaCardProps

describe('ResearchAreaCard', () => {
  test('names the card by its title and shows the description', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} />)

    expect(screen.getByRole('article', { name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.description)).toBeInTheDocument()
  })

  test('links to the detail page with a name that says which area it opens', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} />)

    const link = screen.getByRole('link', {
      name: `Conozca más sobre esta área (${defaultArgs.title})`,
    })

    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).not.toHaveAttribute('target')
  })

  test('offers exactly one link, so each area is a single stop for the keyboard', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  test('keeps the photograph out of the accessibility tree', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('shows a labelled placeholder when the area has no photograph', () => {
    renderWithIntl(<ResearchAreaCard {...withoutImageArgs} />)

    expect(screen.getByText('Imagen del área de investigación')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: withoutImageArgs.title })).toBeInTheDocument()
  })

  test('keeps the full description in the page even when it is clamped visually', () => {
    renderWithIntl(<ResearchAreaCard {...longArgs} />)

    expect(screen.getByText(longArgs.description)).toBeInTheDocument()
  })

  test('marks the language of the title and the description only', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} contentLang="en" />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toHaveAttribute('lang', 'en')
    expect(screen.getByText(defaultArgs.description).parentElement).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('link')).not.toHaveAttribute('lang')
  })

  test('marks text of unknown language with an empty lang', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} contentLang="" />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toHaveAttribute('lang', '')
  })

  test('labels its link and placeholder in the language the site is shown in', () => {
    renderWithIntl(<ResearchAreaCard {...withoutImageArgs} />, { locale: 'en' })

    expect(
      screen.getByRole('link', {
        name: `Learn more about this area (${withoutImageArgs.title})`,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Research area image')).toBeInTheDocument()
  })
})

describe('ResearchAreaCard: long descriptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  /** jsdom lays nothing out: report the description as taller than its three clamped lines. */
  function overflowDescriptions() {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe() {
          this.callback()
        }
        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(60)
  }

  test('clamps a long description to three lines and shows the rest with "Leer más"', async () => {
    overflowDescriptions()
    const user = userEvent.setup()
    renderWithIntl(<ResearchAreaCard {...longArgs} />)

    const description = screen.getByText(longArgs.description)
    expect(description.style.getPropertyValue('--truncated-lines')).toBe('3')

    await user.click(screen.getByRole('button', { name: 'Leer más' }))

    expect(description.style.getPropertyValue('--truncated-lines')).toBe('')
    expect(screen.getByRole('button', { name: 'Leer menos' })).toBeInTheDocument()
    // The detail page is still the card's one link.
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  test('shows no "Leer más" for a description that fits', () => {
    renderWithIntl(<ResearchAreaCard {...defaultArgs} />)

    expect(screen.queryByRole('button', { name: 'Leer más' })).not.toBeInTheDocument()
  })
})
