import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { NewsExplorer, type NewsExplorerProps } from './NewsExplorer'

const defaultArgs: NewsExplorerProps = {
  news: [
    {
      slug: 'ucr-radiotelescopio-investigar-sol',
      title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
      authors: 'Gerardo Quesada A.',
      source: 'El Norte Hoy',
      date: '2023',
      abstract:
        'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
      href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
      imageUrl: '/images/news/el-norte-hoy-1.png',
    },
    {
      slug: 'ucr-contara-con-radiotelescopio-explorar-cosmos',
      title: 'UCR contará con su propio radiotelescopio para explorar el cosmos',
      authors: 'Manrique Vindas Segura',
      source: 'Universidad de Costa Rica (UCR)',
      date: '2017',
      abstract:
        'Un proyecto de investigación de la UCR estudia la transformación de una gran antena instalada en la Finca Experimental de Santa Cruz en un radiotelescopio para estudiar los astros.',
      href: 'https://vinv.ucr.ac.cr/es/noticias/ucr-contara-con-su-propio-radiotelescopio-para-explorar-el-cosmos',
      imageUrl: '/images/news/ucr-3.png',
    },
  ],
}

const emptyArgs: NewsExplorerProps = {
  news: [],
}

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

    const article = defaultArgs.news[0]!

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

  test('renders "Sin fecha" for articles without a published date', () => {
    render(
      <NewsExplorer
        news={[
          {
            slug: 'sin-fecha',
            title: 'Artículo sin fecha',
            authors: 'Autor X',
            source: 'Fuente Y',
            date: 'Sin fecha',
            abstract: 'Resumen.',
            href: 'https://example.com',
            imageUrl: '/images/decorative/Solar-Flare.png',
          },
        ]}
      />,
    )

    expect(screen.getByText(/Sin fecha/)).toBeInTheDocument()
  })
})
