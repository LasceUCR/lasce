import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { RolePermissionsPage, type RolePermissionsPageProps } from './RolePermissionsPage'
import meta, { ErrorState, PendingChanges } from './RolePermissionsPage.stories'

const defaultArgs = meta.args as RolePermissionsPageProps

describe('RolePermissionsPage', () => {
  test('shows the permission matrix with administrator grants locked', () => {
    render(<RolePermissionsPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Permisos por rol' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Crear componentes: Asistente' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Descargar recursos: Visitante' })).toBeChecked()
    expect(
      screen.getByRole('checkbox', {
        name: 'Crear componentes: Persona administradora (no se puede cambiar)',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('checkbox', {
        name: 'Configurar permisos: Persona administradora (no se puede cambiar)',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: 'Descargar recursos: Visitante' }),
    ).not.toBeDisabled()
  })

  test('lets the administrator toggle an unlocked role grant', async () => {
    const user = userEvent.setup()
    const onTogglePermission = vi.fn()
    render(<RolePermissionsPage {...defaultArgs} onTogglePermission={onTogglePermission} />)

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Asistente' }))
    expect(onTogglePermission).toHaveBeenCalledWith('ASSISTANT', 'edit_components')
  })

  test('saves when the form is submitted', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => undefined)
    render(<RolePermissionsPage {...defaultArgs} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  test('announces a save error', () => {
    render(<RolePermissionsPage {...defaultArgs} {...ErrorState.args} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La información de este rol cambió. Recarga la página antes de volver a guardarlo.',
    )
  })

  test('shows pending-change copy next to discard and save', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<RolePermissionsPage {...defaultArgs} {...PendingChanges.args} onDiscard={onDiscard} />)
    expect(screen.getByRole('status')).toHaveTextContent('2 cambios sin guardar')
    expect(screen.getByText('Tienes cambios pendientes de guardar en los permisos.')).toBeVisible()
    expect(screen.getByRole('row', { name: /Editar componentes, sin guardar/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onDiscard).toHaveBeenCalledOnce()
  })
})
