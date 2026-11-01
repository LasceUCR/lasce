import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AuditTrailPage, auditTrailHref } from './AuditTrailPage'
import meta, { Empty, EmptyWithFilters, WithEvents } from './AuditTrailPage.stories'

const withEvents = { ...meta.args, ...WithEvents.args } as React.ComponentProps<
  typeof AuditTrailPage
>
const empty = { ...meta.args, ...Empty.args } as React.ComponentProps<typeof AuditTrailPage>
const emptyFiltered = { ...meta.args, ...EmptyWithFilters.args } as React.ComponentProps<
  typeof AuditTrailPage
>

describe('AuditTrailPage', () => {
  test('lists date and time, actor, action and summary of each event', () => {
    renderWithIntl(<AuditTrailPage {...withEvents} />)

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ana Rodríguez')
    expect(rows[0]).toHaveTextContent('news.create')
    expect(rows[0]).toHaveTextContent('Noticia agregada: Aurora sobre Costa Rica')
    expect(screen.getByText('23 eventos')).toBeInTheDocument()
  })

  test('names the actor of a deleted account', () => {
    renderWithIntl(<AuditTrailPage {...withEvents} />)

    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Cuenta eliminada')
  })

  test('links the other pages and keeps the filters in them', () => {
    renderWithIntl(
      <AuditTrailPage
        {...withEvents}
        trail={{
          ...withEvents.trail,
          filters: { ...withEvents.trail.filters, action: 'news.create' },
        }}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Páginas de la auditoría' })
    expect(within(nav).getByRole('link', { name: /3/ })).toHaveAttribute(
      'href',
      '/administracion/auditoria?action=news.create&page=3',
    )
  })

  test('offers the filters as a form that restarts at the first page', () => {
    renderWithIntl(<AuditTrailPage {...withEvents} />)

    const form = screen.getByRole('form', { name: 'Filtros de la auditoría' })
    expect(form).toHaveAttribute('method', 'get')
    expect(within(form).getByLabelText('Desde')).toBeInTheDocument()
    expect(within(form).getByLabelText('Hasta')).toBeInTheDocument()
    expect(within(form).getByRole('combobox', { name: 'Persona' })).toBeInTheDocument()
    expect(within(form).getByRole('combobox', { name: 'Tipo de elemento' })).toBeInTheDocument()
    expect(within(form).getByRole('combobox', { name: 'Acción' })).toBeInTheDocument()
    expect(within(form).queryByRole('link', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  test('says there are no events, without a table', () => {
    renderWithIntl(<AuditTrailPage {...empty} />)

    expect(screen.getByText('Aún no hay eventos de auditoría registrados.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  test('says no event matches, and offers to clear the filters', () => {
    renderWithIntl(<AuditTrailPage {...emptyFiltered} />)

    expect(screen.getByText('Ningún evento coincide con los filtros.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Limpiar filtros' })).toHaveAttribute(
      'href',
      '/administracion/auditoria',
    )
  })

  test('follows the site language', () => {
    renderWithIntl(<AuditTrailPage {...withEvents} />, { locale: 'en' })

    expect(screen.getByRole('form', { name: 'Audit trail filters' })).toBeInTheDocument()
    expect(screen.getByText('23 events')).toBeInTheDocument()
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Deleted account')
  })
})

describe('auditTrailHref', () => {
  const none = { from: '', to: '', actor: '', entityType: '', action: '' }

  test('leaves out page 1 and empty filters', () => {
    expect(auditTrailHref('/x', none, 1)).toBe('/x')
  })

  test('writes every filter and the page', () => {
    expect(
      auditTrailHref(
        '/x',
        {
          from: '2026-10-01',
          to: '2026-10-31',
          actor: 'a',
          entityType: 'news',
          action: 'news.create',
        },
        2,
      ),
    ).toBe('/x?from=2026-10-01&to=2026-10-31&actor=a&entity=news&action=news.create&page=2')
  })
})
