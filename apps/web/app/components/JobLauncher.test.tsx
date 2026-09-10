import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import es from '@/messages/es.json'

import * as actions from '../actions'
import { JobLauncher } from './JobLauncher'

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('JobLauncher', () => {
  test('shows the empty state, with the seed command, when there are no devices', () => {
    renderWithIntl(<JobLauncher devices={[]} />)

    expect(screen.getByText(/todavía no hay dispositivos/i)).toBeInTheDocument()
    expect(screen.getByText('pnpm --filter @lasce/db seed')).toBeInTheDocument()
  })

  test('enqueues ingest-readings for the selected device and shows the job id', async () => {
    vi.spyOn(actions, 'enqueueJob').mockResolvedValue({ ok: true, jobId: 'job-123' })
    // The status poll hits a relative URL, which Node's `fetch` can't resolve
    // without a real server behind it — left un-stubbed, it rejects into an
    // unhandled promise. A `fetch` that never settles keeps `status` at its
    // initial `null`, which is exactly the state this test asserts on.
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}))
    const user = userEvent.setup()

    renderWithIntl(
      <JobLauncher devices={[{ id: '1', externalId: 'device-001', name: 'Device 1' }]} />,
    )
    await user.click(screen.getByRole('button', { name: 'Encolar ingest-readings' }))

    await waitFor(() => expect(screen.getByText(/job-123/)).toBeInTheDocument())
    expect(screen.getByText(/esperando al worker/i)).toBeInTheDocument()
    expect(actions.enqueueJob).toHaveBeenCalledWith(
      'ingest-readings',
      expect.objectContaining({ deviceId: 'device-001' }),
    )
  })

  test('shows the failure message returned by the action', async () => {
    vi.spyOn(actions, 'enqueueJob').mockResolvedValue({ ok: false, error: 'Queue unavailable' })
    const user = userEvent.setup()

    renderWithIntl(
      <JobLauncher devices={[{ id: '1', externalId: 'device-001', name: 'Device 1' }]} />,
    )
    await user.click(screen.getByRole('button', { name: 'Encolar ingest-readings' }))

    await waitFor(() => expect(screen.getByText('Queue unavailable')).toBeInTheDocument())
  })
})
