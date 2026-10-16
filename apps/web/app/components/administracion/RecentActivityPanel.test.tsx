import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { RecentActivityPanel } from './RecentActivityPanel'
import { Empty, WithActivity } from './RecentActivityPanel.stories'

const empty = { items: Empty.args!.items!, now: Empty.args!.now! }
const withActivity = { items: WithActivity.args!.items!, now: WithActivity.args!.now! }

describe('RecentActivityPanel', () => {
  test('says there is no activity yet instead of an empty list', () => {
    renderWithIntl(<RecentActivityPanel {...empty} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Actividad reciente' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aún no hay actividad registrada.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('lists the events newest first, with when and who', () => {
    renderWithIntl(<RecentActivityPanel {...withActivity} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(
      within(rows[0]!).getByText('Publicación agregada: Solar flares in 2026'),
    ).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent('hace 12 minutos · Ana Rodríguez')
    expect(screen.queryByText('Aún no hay actividad registrada.')).not.toBeInTheDocument()
  })

  test('names the worker, the system and a deleted account', () => {
    renderWithIntl(<RecentActivityPanel {...withActivity} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows[1]).toHaveTextContent('hace 1 hora · Worker')
    expect(rows[2]).toHaveTextContent('hace 3 horas · Cuenta eliminada')
    expect(rows[3]).toHaveTextContent('hace 2 días · Sistema')
  })

  test('gives each event its machine-readable time', () => {
    renderWithIntl(<RecentActivityPanel {...withActivity} />)

    expect(screen.getByText('hace 12 minutos')).toHaveAttribute(
      'datetime',
      withActivity.items[0]!.occurredAt,
    )
  })

  test('speaks English when the site does', () => {
    renderWithIntl(<RecentActivityPanel {...empty} />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 2, name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByText('No activity has been recorded yet.')).toBeInTheDocument()
  })
})
