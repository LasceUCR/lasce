import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { NewsExplorer, type NewsExplorerProps } from './NewsExplorer'
import { Default, Empty } from './NewsExplorer.stories'

const defaultArgs = Default.args as NewsExplorerProps
const emptyArgs = Empty.args as NewsExplorerProps

describe('NewsExplorer', () => {
  test('renders one card per news article it is given', () => {
    render(<NewsExplorer {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(defaultArgs.news.length)
  })

  test('narrows the list to news matching the search query', async () => {
    const user = userEvent.setup()
    render(<NewsExplorer {...defaultArgs} />)

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.title)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  test('matches by source as well as by title', async () => {
    const user = userEvent.setup()
    render(<NewsExplorer {...defaultArgs} />)

    const article = defaultArgs.news[0]!

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.source)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('matches by author as well as by title', async () => {
    const user = userEvent.setup()
    render(<NewsExplorer {...defaultArgs} />)

    const article = defaultArgs.news.find((item) => item.authors.trim() !== '')

    if (!article) {
      throw new Error('Expected at least one news article with an author')
    }

    await user.type(screen.getByRole('searchbox', { name: 'Buscar noticias' }), article.authors)

    expect(
      screen.getByRole('heading', {
        name: article.title,
      }),
    ).toBeInTheDocument()
  })

  test('shows an empty state when there are no news items', () => {
    render(<NewsExplorer {...emptyArgs} />)

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No hay noticias publicadas todavía.')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  test('shows an empty state when nothing matches the search query, without losing the heading', async () => {
    const user = userEvent.setup()
    render(<NewsExplorer {...defaultArgs} />)

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar noticias' }),
      'xyz-no-existe-esta-noticia',
    )

    expect(screen.getByRole('heading', { name: 'Noticias recientes' })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron noticias')

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })
})
