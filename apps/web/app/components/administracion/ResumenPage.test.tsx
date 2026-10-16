import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { SomeEmpty } from './ContentSummaryCards.stories'
import { WithActivity } from './RecentActivityPanel.stories'
import { ResumenPage } from './ResumenPage'

const props = {
  summary: SomeEmpty.args!.summary!,
  activity: [],
  now: new Date('2026-10-16T18:00:00.000Z'),
}

beforeEach(() => {
  // The Servicios panel asks the health endpoints; their answers are ServicesPanel.test.tsx's.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ checks: {} }), { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ResumenPage', () => {
  test('shows the title and the stat cards', () => {
    renderWithIntl(<ResumenPage {...props} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Publicaciones/ })).toHaveTextContent('12')
    expect(screen.getByRole('link', { name: /Noticias/ })).toHaveTextContent('Sin registros')
  })

  test('no longer flags its content as provisional', () => {
    renderWithIntl(<ResumenPage {...props} />)

    expect(
      screen.queryByRole('complementary', { name: 'Información provisional' }),
    ).not.toBeInTheDocument()
  })

  test('lists the recent activity it is given', () => {
    renderWithIntl(
      <ResumenPage {...props} activity={WithActivity.args!.items!} now={WithActivity.args!.now!} />,
    )

    expect(screen.getByText('Publicación agregada: Solar flares in 2026')).toBeInTheDocument()
  })

  test('says there is no recent activity when none has been recorded', () => {
    renderWithIntl(<ResumenPage {...props} />)

    expect(screen.getByText('Aún no hay actividad registrada.')).toBeInTheDocument()
  })

  test('shows the services panel with their status', async () => {
    renderWithIntl(<ResumenPage {...props} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Servicios' })).toBeInTheDocument()
    expect(await screen.findAllByText('Fuera de línea')).toHaveLength(6)
  })

  test('has no tasks and pipelines panel while there is nothing to show in it', () => {
    renderWithIntl(<ResumenPage {...props} />)

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Tareas y pipelines' }),
    ).not.toBeInTheDocument()
  })

  test('speaks English when the site does', () => {
    renderWithIntl(<ResumenPage {...props} />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByText('Overall state of the laboratory and its systems.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Infrastructure status' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Services' })).toBeInTheDocument()
  })
})
