import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Modal } from '@/app/components/public/Modal'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { SUCCESS_TOAST_DURATION_MS, ToastProvider, useToast } from './ToastProvider'

function Harness() {
  const toast = useToast()
  const lastId = useRef<number | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => (lastId.current = toast.show('success', 'Guardado.'))} type="button">
        Éxito
      </button>
      <button onClick={() => (lastId.current = toast.show('error', 'Falló.'))} type="button">
        Error
      </button>
      <button
        onClick={() => lastId.current !== null && toast.dismiss(lastId.current)}
        type="button"
      >
        Descartar el último
      </button>
      <button onClick={() => setOpen(true)} type="button">
        Abrir
      </button>
      <Modal onClose={() => setOpen(false)} open={open} title="Formulario">
        <button onClick={() => toast.show('error', 'Falló en el modal.')} type="button">
          Error en el modal
        </button>
        <button
          onClick={() => {
            setOpen(false)
            toast.show('success', 'Guardado desde el modal.')
          }}
          type="button"
        >
          Guardar
        </button>
        <button onClick={() => setOpen(false)} type="button">
          Cerrar
        </button>
      </Modal>
    </>
  )
}

function renderHarness() {
  return renderWithIntl(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider', () => {
  test('announces a success politely and an error assertively', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Éxito' }))
    await user.click(screen.getByRole('button', { name: 'Error' }))

    expect(screen.getByText('Guardado.').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    )
    expect(screen.getByText('Falló.').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'assertive',
    )
  })

  test('hides a success on its own after a few seconds', () => {
    vi.useFakeTimers()
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Éxito' }))
    expect(screen.getByText('Guardado.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS)
    })

    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument()
  })

  test('keeps an error until it is dismissed', async () => {
    vi.useFakeTimers()
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Error' }))
    act(() => {
      vi.advanceTimersByTime(SUCCESS_TOAST_DURATION_MS * 2)
    })
    expect(screen.getByText('Falló.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(screen.queryByText('Falló.')).not.toBeInTheDocument()
  })

  test('dismisses a toast by the id show returned', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Éxito' }))
    await user.click(screen.getByRole('button', { name: 'Descartar el último' }))

    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument()
  })

  test('shows a toast inside an open modal, where it is not inert', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = screen.getByRole('dialog', { name: 'Formulario' })
    await user.click(within(dialog).getByRole('button', { name: 'Error en el modal' }))

    expect(within(dialog).getByText('Falló en el modal.')).toBeInTheDocument()
  })

  test('moves a success shown while closing the modal back to the page', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Guardado desde el modal.')).toBeInTheDocument()
  })

  test('drops an error raised inside a modal once the modal closes', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Error en el modal' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByText('Falló en el modal.')).not.toBeInTheDocument()
  })

  test('keeps a page error visible after a modal opens and closes', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Error' }))
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.getByText('Falló.')).toBeInTheDocument()
  })
})

describe('useToast', () => {
  test('fails loudly outside a ToastProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    function Orphan() {
      useToast()
      return null
    }

    expect(() => render(<Orphan />)).toThrow('useToast must be used inside <ToastProvider>.')
  })
})
