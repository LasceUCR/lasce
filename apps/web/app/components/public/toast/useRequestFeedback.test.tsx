import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ToastProvider } from './ToastProvider'
import { useRequestFeedback, type RequestFeedbackOptions } from './useRequestFeedback'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const options: RequestFeedbackOptions = {
  success: 'Noticia agregada correctamente.',
  fallback: 'No se pudo guardar la noticia. Inténtelo de nuevo.',
}

function Harness({
  onSuccess,
  onResult,
}: {
  onSuccess?: () => void
  onResult?: (ok: boolean) => void
}) {
  const send = useRequestFeedback()

  return (
    <button
      onClick={async () => {
        const ok = await send('/api/example', { method: 'POST' }, { ...options, onSuccess })
        onResult?.(ok)
      }}
      type="button"
    >
      Enviar
    </button>
  )
}

function renderHarness(props: { onSuccess?: () => void; onResult?: (ok: boolean) => void } = {}) {
  return renderWithIntl(
    <ToastProvider>
      <Harness {...props} />
    </ToastProvider>,
  )
}

function failedResponse(status: number, body: unknown) {
  return { ok: false, status, json: async () => body }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useRequestFeedback', () => {
  test('runs onSuccess, then shows the success toast and resolves true', async () => {
    const user = userEvent.setup()
    const order: string[] = []
    const onSuccess = vi.fn(() => order.push('onSuccess'))
    const onResult = vi.fn()
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) })
    renderHarness({ onSuccess, onResult })

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Noticia agregada correctamente.')).toBeInTheDocument()
    expect(order).toEqual(['onSuccess'])
    expect(onResult).toHaveBeenCalledWith(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/example', { method: 'POST' })
  })

  test('shows the reason the server gave and resolves false without calling onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const onResult = vi.fn()
    fetchMock.mockResolvedValue(
      failedResponse(409, { error: 'Ya existe una noticia con este enlace.' }),
    )
    renderHarness({ onSuccess, onResult })

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Ya existe una noticia con este enlace.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledWith(false)
  })

  test('says the server could not be reached when fetch throws', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText(
        'No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.',
      ),
    ).toBeInTheDocument()
  })

  test('falls back to a server message for a 5xx without a reason', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    })
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText(
        'El servidor no pudo completar la operación. Inténtelo de nuevo en unos minutos.',
      ),
    ).toBeInTheDocument()
  })

  test('falls back to the caller message for another failure without a reason', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(failedResponse(400, {}))
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText(options.fallback)).toBeInTheDocument()
  })

  test('replaces the previous error on the next attempt', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(failedResponse(403, { error: 'No tiene permisos.' }))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('No tiene permisos.')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Noticia agregada correctamente.')).toBeInTheDocument()
    expect(screen.queryByText('No tiene permisos.')).not.toBeInTheDocument()
  })
})
