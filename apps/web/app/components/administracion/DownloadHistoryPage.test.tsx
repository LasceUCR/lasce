import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { DownloadHistoryPage, downloadHistoryHref, queriedRange } from './DownloadHistoryPage'
import meta, { Empty, EmptyWithFilters, WithDownloads } from './DownloadHistoryPage.stories'

type Props = React.ComponentProps<typeof DownloadHistoryPage>

const withDownloads = { ...meta.args, ...WithDownloads.args } as Props
const empty = { ...meta.args, ...Empty.args } as Props
const emptyFiltered = { ...meta.args, ...EmptyWithFilters.args } as Props

describe('DownloadHistoryPage', () => {
  test('lists each download with its date, user, source, instrument, product, format and range', () => {
    renderWithIntl(<DownloadHistoryPage {...withDownloads} />)

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ana Rodríguez')
    expect(rows[0]).toHaveTextContent('GOES')
    expect(rows[0]).toHaveTextContent('EXIS')
    expect(rows[0]).toHaveTextContent('EXIS-L1b-SFXR')
    expect(rows[0]).toHaveTextContent('CSV')
    expect(rows[0]).toHaveTextContent('2026-10-15 00:00–23:59')
  })

  test('shows the total number of records and pages', () => {
    renderWithIntl(<DownloadHistoryPage {...withDownloads} />)

    expect(screen.getByRole('status')).toHaveTextContent('23 descargas')
    expect(screen.getByRole('status')).toHaveTextContent('Página 2 de 3')
  })

  test('keeps a download whose account was deleted, naming it "Cuenta eliminada"', () => {
    renderWithIntl(<DownloadHistoryPage {...withDownloads} />)

    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Cuenta eliminada')
  })

  test('links the other pages and keeps the filters in them', () => {
    renderWithIntl(
      <DownloadHistoryPage
        {...withDownloads}
        history={{
          ...withDownloads.history,
          filters: { ...withDownloads.history.filters, format: 'csv' },
        }}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Páginas del historial de descargas' })
    expect(within(nav).getByRole('link', { name: /3/ })).toHaveAttribute(
      'href',
      '/administracion/descargas?format=csv&page=3',
    )
  })

  test('offers the filters as a form that restarts at the first page', () => {
    renderWithIntl(<DownloadHistoryPage {...withDownloads} />)

    const form = screen.getByRole('form', { name: 'Filtros del historial de descargas' })
    expect(form).toHaveAttribute('method', 'get')
    expect(within(form).getByLabelText('Desde')).toBeInTheDocument()
    expect(within(form).getByLabelText('Hasta')).toBeInTheDocument()
    for (const name of ['Fuente', 'Instrumento', 'Formato', 'Persona']) {
      expect(within(form).getByRole('combobox', { name })).toBeInTheDocument()
    }
    expect(within(form).queryByRole('link', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  test('explains an empty history', () => {
    renderWithIntl(<DownloadHistoryPage {...empty} />)

    expect(screen.getByText('Aún no hay descargas registradas.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  test('explains when no download matches, and offers to clear the filters', () => {
    renderWithIntl(<DownloadHistoryPage {...emptyFiltered} />)

    expect(screen.getByText('Ninguna descarga coincide con los filtros.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Limpiar filtros' })).toHaveAttribute(
      'href',
      '/administracion/descargas',
    )
  })

  test('speaks English when the site does', () => {
    renderWithIntl(<DownloadHistoryPage {...withDownloads} />, { locale: 'en' })

    expect(screen.getByRole('status')).toHaveTextContent('23 downloads')
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Deleted account')
    expect(screen.getByRole('columnheader', { name: 'Date and time (UTC)' })).toBeInTheDocument()
  })
})

describe('downloadHistoryHref', () => {
  const filters = { from: '', to: '', source: '', instrument: '', format: '', user: '' }

  test('leaves out page 1 and empty filters', () => {
    expect(downloadHistoryHref('/administracion/descargas', filters, 1)).toBe(
      '/administracion/descargas',
    )
  })

  test('writes every active filter and the page', () => {
    expect(
      downloadHistoryHref(
        '/administracion/descargas',
        { ...filters, from: '2026-10-01', source: 'GOES', instrument: 'EXIS' },
        4,
      ),
    ).toBe('/administracion/descargas?from=2026-10-01&source=GOES&instrument=EXIS&page=4')
  })
})

describe('queriedRange', () => {
  const base = { date: '', startTime: '', endTime: '' } as Parameters<typeof queriedRange>[0]

  test('joins the day and the time window', () => {
    expect(
      queriedRange({ ...base, date: '2026-10-15', startTime: '01:00', endTime: '02:00' }),
    ).toBe('2026-10-15 01:00–02:00')
  })

  test('is empty when nothing was recorded', () => {
    expect(queriedRange(base)).toBe('')
  })
})
