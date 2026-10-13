import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { StandardConfirmDialog, type StandardConfirmDialogProps } from './StandardConfirmDialog'
import {
  DestructiveDelete,
  DiscardChangesWarning,
  ErrorState,
  SaveConfirmation,
  SubmittingState,
} from './StandardConfirmDialog.stories'

const defaultArgs = DestructiveDelete.args as StandardConfirmDialogProps

describe('StandardConfirmDialog', () => {
  test('renders dialog title and message', () => {
    render(<StandardConfirmDialog {...defaultArgs} />)

    expect(screen.getByRole('dialog', { name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.message)).toBeInTheDocument()
  })

  test('renders danger confirm button with custom label for destructive action', () => {
    render(<StandardConfirmDialog {...defaultArgs} />)

    const confirmBtn = screen.getByRole('button', { name: 'Sí, eliminar' })
    expect(confirmBtn).toBeInTheDocument()
    expect(confirmBtn).toHaveClass('button-danger')
  })

  test('calls onConfirm when confirm button is pressed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<StandardConfirmDialog {...defaultArgs} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('calls onCancel when cancel button is pressed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<StandardConfirmDialog {...defaultArgs} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('disables buttons and shows spinner when isSubmitting is true', () => {
    render(<StandardConfirmDialog {...(SubmittingState.args as StandardConfirmDialogProps)} />)

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByText('Eliminando registro...')).toBeInTheDocument()
  })

  test('renders error message in an alert region when provided', () => {
    render(<StandardConfirmDialog {...(ErrorState.args as StandardConfirmDialogProps)} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/No se pudo completar la eliminación/)
  })

  test('renders info and warning variants properly', () => {
    const { rerender } = render(
      <StandardConfirmDialog {...(SaveConfirmation.args as StandardConfirmDialogProps)} />,
    )
    expect(screen.getByText('Guardar y publicar')).toBeInTheDocument()

    rerender(
      <StandardConfirmDialog {...(DiscardChangesWarning.args as StandardConfirmDialogProps)} />,
    )
    expect(screen.getByText('Descartar y salir')).toBeInTheDocument()
  })

  test('names the target entity with the label it is given', () => {
    render(
      <StandardConfirmDialog {...defaultArgs} targetLabel="Item" targetEntity="Solar activity" />,
    )

    expect(screen.getByText('Item:')).toBeInTheDocument()
    expect(screen.getByText('Solar activity')).toBeInTheDocument()
  })
})
