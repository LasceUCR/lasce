import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { RolePermissionsPage, type RolePermissionsPageProps } from './RolePermissionsPage'
import meta, { ErrorState, Visitor } from './RolePermissionsPage.stories'

const defaultArgs = meta.args as RolePermissionsPageProps

describe('RolePermissionsPage', () => {
  test('shows the selected role and its current permissions', () => {
    render(<RolePermissionsPage {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Persona administradora' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Crear componentes/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Configurar permisos/ })).toBeDisabled()
  })

  test('lets the administrator pick another role and toggle an unlocked permission', async () => {
    const user = userEvent.setup()
    const onSelectRole = vi.fn()
    const onTogglePermission = vi.fn()
    render(
      <RolePermissionsPage
        {...defaultArgs}
        {...Visitor.args}
        onSelectRole={onSelectRole}
        onTogglePermission={onTogglePermission}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Asistente' }))
    expect(onSelectRole).toHaveBeenCalledWith('ASSISTANT')
    await user.click(screen.getByRole('checkbox', { name: /Editar componentes/ }))
    expect(onTogglePermission).toHaveBeenCalledWith('edit_components')
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
})
