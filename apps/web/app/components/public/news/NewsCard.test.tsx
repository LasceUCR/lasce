import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NewsCard, type NewsCardProps } from './NewsCard'
import { Default, LongText, Undated, WithoutLink, WithoutSummary } from './NewsCard.stories'

const defaultArgs = Default.args as NewsCardProps

describe('NewsCard', () => {
  test('leads with the title as a heading', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: defaultArgs.title })).toBeInTheDocument()
  })

  test('shows authors, source and date on one line, with a machine-readable date', () => {
    render(<NewsCard {...defaultArgs} />)

    const meta = screen.getByText(defaultArgs.source, { exact: false })
    expect(meta).toHaveTextContent(
      `${defaultArgs.authors} · ${defaultArgs.source} · ${defaultArgs.date}`,
    )
    expect(screen.getByText(defaultArgs.date)).toHaveAttribute('datetime', '2026-05-24')
  })

  test('shows "Sin fecha" as plain text for an undated item', () => {
    render(<NewsCard {...(Undated.args as NewsCardProps)} />)

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
    expect(document.querySelector('time')).toBeNull()
  })

  test('leaves the authors out of the line when there are none', () => {
    render(<NewsCard {...defaultArgs} authors="" />)

    expect(screen.getByText(defaultArgs.source, { exact: false })).toHaveTextContent(
      `${defaultArgs.source} · ${defaultArgs.date}`,
    )
  })

  test('shows the summary when there is one', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.abstract)).toBeInTheDocument()
  })

  test('omits the summary paragraph when there is none', () => {
    const args = WithoutSummary.args as NewsCardProps
    const { container } = render(<NewsCard {...args} />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  test('shows no image', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('opens the external article, which is the item’s detail view, in a new tab', () => {
    render(<NewsCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /^Abrir fuente/ })
    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('names the link after its article and says it opens a new tab', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(
      screen.getByRole('link', {
        name: `Abrir fuente de «${defaultArgs.title}» (se abre en una pestaña nueva)`,
      }),
    ).toBeInTheDocument()
  })

  test('renders no link when the item has none', () => {
    render(<NewsCard {...(WithoutLink.args as NewsCardProps)} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('renders long text in full for the layout to wrap', () => {
    const args = LongText.args as NewsCardProps
    render(<NewsCard {...args} />)

    expect(screen.getByRole('heading', { name: args.title })).toBeInTheDocument()
    expect(screen.getByText(args.abstract)).toBeInTheDocument()
  })
})
