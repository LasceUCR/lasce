import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NewsArticlePage, type NewsArticlePageProps } from './NewsArticlePage'
import { Default, MinimalDetails } from './NewsArticlePage.stories'

const defaultArgs = Default.args as NewsArticlePageProps
const minimalArgs = MinimalDetails.args as NewsArticlePageProps

describe('NewsArticlePage', () => {
  test('renders the news title as an h1 and the abstract as lead', () => {
    render(<NewsArticlePage {...defaultArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: defaultArgs.article.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByText(defaultArgs.article.abstract).length).toBeGreaterThan(0)
  })

  test('renders metadata cards for authors, source, and date', () => {
    render(<NewsArticlePage {...defaultArgs} />)

    expect(screen.getByText('Autores')).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.article.authors)).toBeInTheDocument()

    expect(screen.getByText('Fuente')).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.article.source)).toBeInTheDocument()

    expect(screen.getByText('Fecha')).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.article.date)).toBeInTheDocument()
  })

  test('renders external source button when href is present', () => {
    render(<NewsArticlePage {...defaultArgs} />)

    const externalLink = screen.getByRole('link', { name: 'Abrir fuente original' })
    expect(externalLink).toHaveAttribute('href', defaultArgs.article.href)
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(externalLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('renders back link to the news listing', () => {
    render(<NewsArticlePage {...defaultArgs} />)

    const backLink = screen.getByRole('link', {
      name: defaultArgs.backLabel!,
    })
    expect(backLink).toHaveAttribute('href', defaultArgs.backHref)
  })

  test('renders cleanly with minimal article data', () => {
    render(<NewsArticlePage {...minimalArgs} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: minimalArgs.article.title,
      }),
    ).toBeInTheDocument()

    expect(screen.queryByText('Autores')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir fuente original' })).not.toBeInTheDocument()
  })
})
