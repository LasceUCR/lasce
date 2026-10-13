import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ManagementModal, type ManagementModalProps } from './ManagementModal'
import { BlankNewRecord, PreFilledEditing } from './ManagementModal.stories'

describe('ManagementModal', () => {
  test('renders modal title and form inputs when open', () => {
    render(<ManagementModal {...(BlankNewRecord.args as ManagementModalProps)} />)

    expect(screen.getByRole('dialog', { name: 'Gestión de Investigador' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre completo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Rol o especialidad/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Institución o afiliación/)).toBeInTheDocument()
  })

  test('displays contextual red error messages and highlights inputs when attempting to save with empty fields', async () => {
    const user = userEvent.setup()
    render(<ManagementModal {...(BlankNewRecord.args as ManagementModalProps)} />)

    // Initially, no validation alert is shown
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Click "Guardar cambios" without completing fields
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // Contextual field alerts appear
    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Debe especificar el rol o cargo.')).toBeInTheDocument()
    expect(screen.getByText('La institución o afiliación es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('Debe cargar una fotografía del investigador.')).toBeInTheDocument()

    // Inputs are marked as invalid
    const nameInput = screen.getByLabelText(/Nombre completo/)
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('opens standard confirm dialog and hides the management modal behind it when save is clicked', async () => {
    const user = userEvent.setup()
    render(<ManagementModal {...(PreFilledEditing.args as ManagementModalProps)} />)

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // Management modal is hidden behind
    expect(
      screen.queryByRole('dialog', { name: 'Gestión de Investigador' }),
    ).not.toBeInTheDocument()

    // Standard confirm dialog appears
    expect(
      screen.getByRole('dialog', { name: 'Confirmar guardado de cambios' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Carolina Salas Matamoros/)).toBeInTheDocument()
  })

  test('opens destructive confirm dialog and hides the management modal behind it when delete is clicked', async () => {
    const user = userEvent.setup()
    render(<ManagementModal {...(PreFilledEditing.args as ManagementModalProps)} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar registro' }))

    // Management modal is hidden behind
    expect(
      screen.queryByRole('dialog', { name: 'Gestión de Investigador' }),
    ).not.toBeInTheDocument()

    // Destructive confirm dialog appears
    expect(screen.getByRole('dialog', { name: 'Confirmar eliminación' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, eliminar investigador' })).toBeInTheDocument()
  })

  test('opens discard confirm dialog when canceling with pending errors or modifications, hiding management modal, and resets upon confirmation', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ManagementModal {...(BlankNewRecord.args as ManagementModalProps)} onClose={onClose} />)

    // Trigger validation by clicking save with empty fields
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()

    // Click Cancelar
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Management modal is hidden behind
    expect(
      screen.queryByRole('dialog', { name: 'Gestión de Investigador' }),
    ).not.toBeInTheDocument()

    // Discard confirm dialog appears
    expect(
      screen.getByRole('dialog', { name: 'Descartar cambios no guardados' }),
    ).toBeInTheDocument()

    // Confirm discarding
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
