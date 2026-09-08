import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { NewsCard, type NewsCardProps } from './NewsCard'

const defaultArgs: NewsCardProps = {
  title: 'UCR pone en funcionamiento radiotelescopio para investigar el Sol',
  authors: 'Gerardo Quesada A.',
  source: 'El Norte Hoy',
  date: '2023',
  abstract:
    'ROSAC, el radiotelescopio del Radio Observatorio de Santa Cruz, permitirá monitorear la radiación solar durante las 24 horas y generar datos para investigaciones científicas.',
  href: 'https://elnortehoycr.com/2023/10/02/ucr-pone-en-funcionamiento-radiotelescopio-para-investigar-el-sol/',
  imageUrl: '/images/news/el-norte-hoy-1.png',
}

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

    expect(screen.getByRole('img')).toHaveAttribute('alt', defaultArgs.title)
    expect(screen.getByRole('img')).toHaveAttribute('src')
  })

  test('links out through the external source action', () => {
    render(<NewsCard {...defaultArgs} />)

    const link = screen.getByRole('link', { name: /Abrir fuente/i })

    expect(link).toHaveAttribute('href', defaultArgs.href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('applies the abstract clamp class', () => {
    render(<NewsCard {...defaultArgs} />)

    expect(screen.getByText(defaultArgs.abstract)).toHaveClass('news-abstract')
  })
})
