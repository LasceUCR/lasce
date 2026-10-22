import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { Pagination, type PaginationProps } from './Pagination'
import {
  CustomLabel,
  FirstPage,
  LastPage,
  ManyPages,
  MiddlePage,
  SinglePage,
} from './Pagination.stories'

const base = { hrefForPage: (page: number) => `/noticias?page=${page}` }

function renderPagination(args: Partial<PaginationProps> | undefined, locale?: 'es' | 'en') {
  return renderWithIntl(<Pagination {...base} {...(args as PaginationProps)} />, { locale })
}

function navigation(name = 'Paginación') {
  return screen.getByRole('navigation', { name })
}

function pageNumbers() {
  return within(navigation())
    .getAllByRole('link', { name: /^Página \d+$/ })
    .map((link) => link.textContent)
}

describe('Pagination', () => {
  test('links to every page of a short listing, and marks the current one', () => {
    renderPagination(MiddlePage.args)

    expect(pageNumbers()).toEqual(['1', '2', '3'])
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Página 1' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Página 3' })).toHaveAttribute(
      'href',
      '/noticias?page=3',
    )
  })

  test('links to the previous and the next page', () => {
    renderPagination(MiddlePage.args)

    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute(
      'href',
      '/noticias?page=1',
    )
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute(
      'href',
      '/noticias?page=3',
    )
  })

  test('offers no previous page on the first page', () => {
    renderPagination(FirstPage.args)

    expect(screen.queryByRole('link', { name: 'Anterior' })).not.toBeInTheDocument()
    expect(within(navigation()).getByText('Anterior').closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Siguiente' })).toBeInTheDocument()
  })

  test('offers no next page on the last page', () => {
    renderPagination(LastPage.args)

    expect(screen.queryByRole('link', { name: 'Siguiente' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anterior' })).toBeInTheDocument()
  })

  test('leaves gaps between the first page, the current one and the last one', () => {
    renderPagination(ManyPages.args)

    expect(pageNumbers()).toEqual(['1', '5', '6', '7', '12'])
    expect(within(navigation()).getAllByText('…')).toHaveLength(2)
  })

  test('says which page is shown out of how many, for narrow screens', () => {
    renderPagination(ManyPages.args)

    expect(within(navigation()).getByText('Página 6 de 12')).toBeInTheDocument()
  })

  test('renders nothing when everything fits on one page', () => {
    const { container } = renderPagination(SinglePage.args)

    expect(container).toBeEmptyDOMElement()
  })

  test('renders nothing when there are no pages at all', () => {
    const { container } = renderPagination({ currentPage: 1, totalPages: 0 })

    expect(container).toBeEmptyDOMElement()
  })

  test('shows the nearest page when the current one is out of range', () => {
    renderPagination({ currentPage: 9, totalPages: 3 })

    expect(screen.getByRole('link', { name: 'Página 3' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Siguiente' })).not.toBeInTheDocument()
  })

  test('takes a label of its own for the navigation landmark', () => {
    renderPagination(CustomLabel.args)

    expect(screen.getByRole('navigation', { name: 'Páginas de noticias' })).toBeInTheDocument()
  })

  test('speaks English on the English site', () => {
    renderPagination(ManyPages.args, 'en')

    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(within(nav).getByRole('link', { name: 'Previous' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Next' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Page 6' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByText('Page 6 of 12')).toBeInTheDocument()
  })
})
