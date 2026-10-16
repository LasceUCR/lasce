import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { NewsCard, type NewsCardProps } from './NewsCard'
import { Default, LongText, Undated, WithoutLink, WithoutSummary } from './NewsCard.stories'

const defaultArgs = Default.args as NewsCardProps

function mockAbstractOverflow(overflows: boolean) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe() {
        this.callback()
      }
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(overflows ? 200 : 80)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(80)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('NewsCard', () => {
  test('leads with the title as a heading', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: defaultArgs.title })).toBeInTheDocument()
  })

  test('shows authors, source and date on one line, with a machine-readable date', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    const meta = screen.getByText(defaultArgs.source, { exact: false })
    expect(meta).toHaveTextContent(
      `${defaultArgs.authors} · ${defaultArgs.source} · ${defaultArgs.date}`,
    )
    expect(screen.getByText(defaultArgs.date)).toHaveAttribute('datetime', '2026-05-24')
  })

  test('shows "Sin fecha" as plain text for an undated item', () => {
    renderWithIntl(<NewsCard {...(Undated.args as NewsCardProps)} />)

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
    expect(document.querySelector('time')).toBeNull()
  })

  test('leaves the authors out of the line when there are none', () => {
    renderWithIntl(<NewsCard {...defaultArgs} authors="" />)

    expect(screen.getByText(defaultArgs.source, { exact: false })).toHaveTextContent(
      `${defaultArgs.source} · ${defaultArgs.date}`,
    )
  })

  test('shows the summary when there is one', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.abstract)).toBeInTheDocument()
  })

  test('omits the summary paragraph when there is none', () => {
    const args = WithoutSummary.args as NewsCardProps
    const { container } = renderWithIntl(<NewsCard {...args} />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  test('shows no image', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('opens the external article in a new tab', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /^Abrir fuente/ })
    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('names the link after its article and says it opens a new tab', () => {
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(
      screen.getByRole('link', {
        name: `Abrir fuente de «${defaultArgs.title}» (se abre en una pestaña nueva)`,
      }),
    ).toBeInTheDocument()
  })

  test('renders no link when the item has none', () => {
    renderWithIntl(<NewsCard {...(WithoutLink.args as NewsCardProps)} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('renders long text in full for the layout to wrap', () => {
    const args = LongText.args as NewsCardProps
    renderWithIntl(<NewsCard {...args} />)

    expect(screen.getByRole('heading', { name: args.title })).toBeInTheDocument()
    expect(screen.getByText(args.abstract)).toBeInTheDocument()
  })

  test('offers "Leer más" inline when the abstract overflows, and expands it in place', () => {
    mockAbstractOverflow(true)
    renderWithIntl(<NewsCard {...defaultArgs} />)

    const abstract = screen.getByText(defaultArgs.abstract)
    const toggle = screen.getByRole('button', { name: 'Leer más' })
    expect(abstract).toContainElement(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Leer menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Leer menos' }))

    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument()
  })

  test('does not show the toggle when the abstract fits without overflowing', () => {
    mockAbstractOverflow(false)
    renderWithIntl(<NewsCard {...defaultArgs} />)

    expect(screen.queryByRole('button', { name: 'Leer más' })).not.toBeInTheDocument()
  })
})
