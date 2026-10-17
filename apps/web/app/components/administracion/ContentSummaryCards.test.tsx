import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ContentSummaryCards } from './ContentSummaryCards'
import { SomeEmpty, WithContent } from './ContentSummaryCards.stories'

describe('ContentSummaryCards', () => {
  test('shows a card per category, each linking to where its content lives', () => {
    renderWithIntl(<ContentSummaryCards summary={WithContent.args!.summary!} />)

    expect(screen.getByRole('region', { name: 'Contenido del portal' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByRole('link', { name: /Publicaciones/ })).toHaveAttribute(
      'href',
      '/publicaciones',
    )
    expect(screen.getByRole('link', { name: /Investigadores ROSAC/ })).toHaveAttribute(
      'href',
      '/radioastronomia',
    )
    expect(screen.getByRole('link', { name: /Instrumentos consultables/ })).toHaveAttribute(
      'href',
      '/datos',
    )
  })

  test('formats each count in the site language', () => {
    renderWithIntl(<ContentSummaryCards summary={WithContent.args!.summary!} />)

    expect(screen.getByRole('link', { name: /Publicaciones/ })).toHaveTextContent('1204')
    expect(screen.getByRole('link', { name: /Noticias/ })).toHaveTextContent('18')
  })

  test('says a category has no records instead of showing zero', () => {
    renderWithIntl(<ContentSummaryCards summary={SomeEmpty.args!.summary!} />)

    expect(screen.getByRole('link', { name: /Noticias/ })).toHaveTextContent('Sin registros')
    expect(screen.getByRole('link', { name: /Investigadores LASCE/ })).toHaveTextContent(
      'Sin registros',
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  test('speaks English when the site does', () => {
    renderWithIntl(<ContentSummaryCards summary={SomeEmpty.args!.summary!} />, { locale: 'en' })

    expect(screen.getByRole('region', { name: 'Portal content' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /News/ })).toHaveTextContent('No records')
  })
})
