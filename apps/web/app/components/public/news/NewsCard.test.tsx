import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NewsCard, type NewsCardProps } from './NewsCard'
import { Default } from './NewsCard.stories'

const defaultArgs = Default.args as NewsCardProps

describe('NewsCard', () => {
  test('shows the title, authors, source and date it was given', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { name: defaultArgs.title })).toBeInTheDocument()

    expect(
      screen.getByText(`${defaultArgs.authors} · ${defaultArgs.source} · ${defaultArgs.date}`),
    ).toBeInTheDocument()
  })

  test('shows the abstract', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.abstract)).toBeInTheDocument()
  })

  test('shows the news image', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByRole('img')).toHaveAttribute('src')
  })

  test('links out through the external source action', () => {
    render(<NewsCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /Abrir fuente/ })

    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('shows the abstract, clamped so it cannot grow past two lines', () => {
    render(<NewsCard {...defaultArgs} />)

    const abstract = screen.getByText(defaultArgs.abstract)
    expect(abstract).toHaveClass('news-abstract')
  })
})
