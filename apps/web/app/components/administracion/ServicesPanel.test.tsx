import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { LiveServicesPanel, ServicesPanel } from './ServicesPanel'
import { AllOnline, Checking, SomeOffline } from './ServicesPanel.stories'

function statusOf(name: string) {
  const row = screen.getByText(name).closest('li')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}

const fetchMock = vi.fn<typeof fetch>()

function answer(bodies: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url) => {
    const body = bodies[String(url)]
    if (body instanceof Error) throw body
    return new Response(JSON.stringify(body), { status: 200 })
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ServicesPanel', () => {
  test('lists every service as online', () => {
    renderWithIntl(<ServicesPanel statuses={AllOnline.args!.statuses!} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Servicios' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getAllByText('En línea')).toHaveLength(6)
  })

  test('says which services are offline', () => {
    renderWithIntl(<ServicesPanel statuses={SomeOffline.args!.statuses!} />)

    expect(statusOf('Workers de procesamiento').getByText('Fuera de línea')).toBeInTheDocument()
    expect(statusOf('Series temporales (InfluxDB)').getByText('Fuera de línea')).toBeInTheDocument()
    expect(statusOf('Almacenamiento MinIO').getByText('En línea')).toBeInTheDocument()
  })

  test('shows that the services are being checked', () => {
    renderWithIntl(<ServicesPanel statuses={Checking.args!.statuses!} />)

    expect(screen.getAllByText('Verificando…')).toHaveLength(6)
  })

  test('speaks English when the site does', () => {
    renderWithIntl(<ServicesPanel statuses={SomeOffline.args!.statuses!} />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 2, name: 'Services' })).toBeInTheDocument()
    expect(statusOf('Processing workers').getByText('Offline')).toBeInTheDocument()
  })
})

describe('LiveServicesPanel', () => {
  test('shows what both health endpoints report', async () => {
    answer({
      '/api/health': { status: 'degraded', checks: { postgres: 'ok', redis: 'timed out' } },
      '/api/health/services': {
        status: 'degraded',
        checks: { api: 'ok', workers: 'down', minio: 'ok', influxdb: 'ok' },
      },
    })

    renderWithIntl(<LiveServicesPanel />)

    expect(screen.getAllByText('Verificando…')).toHaveLength(6)
    await waitFor(() => expect(screen.queryByText('Verificando…')).not.toBeInTheDocument())
    expect(statusOf('Base de datos PostgreSQL').getByText('En línea')).toBeInTheDocument()
    expect(statusOf('Cola de trabajos (Redis)').getByText('Fuera de línea')).toBeInTheDocument()
    expect(statusOf('Workers de procesamiento').getByText('Fuera de línea')).toBeInTheDocument()
    expect(statusOf('API pública').getByText('En línea')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/health', { cache: 'no-store' })
    expect(fetchMock).toHaveBeenCalledWith('/api/health/services', { cache: 'no-store' })
  })

  test('marks the services of an endpoint that cannot be reached as offline', async () => {
    answer({
      '/api/health': { status: 'ok', checks: { postgres: 'ok', redis: 'ok' } },
      '/api/health/services': new Error('Failed to fetch'),
    })

    renderWithIntl(<LiveServicesPanel />)

    await waitFor(() => expect(screen.getAllByText('Fuera de línea')).toHaveLength(4))
    expect(screen.getAllByText('En línea')).toHaveLength(2)
  })

  test('marks the services as offline when an endpoint answers without JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    renderWithIntl(<LiveServicesPanel />)

    await waitFor(() => expect(screen.getAllByText('Fuera de línea')).toHaveLength(6))
  })
})
