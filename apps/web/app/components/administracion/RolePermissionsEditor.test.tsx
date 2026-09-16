import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import type { Permission } from '@/app/lib/auth/permissions'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'

import { RolePermissionsEditor } from './RolePermissionsEditor'
import meta from './RolePermissionsEditor.stories'
import type { RolePermissionsEditorProps } from './RolePermissionsEditor'

mockDialog()

describe('persisted role permissions', () => {
  test('updates an editable role only after the save is confirmed', async () => {
    const saveAction = vi.fn(async () => ({
      ok: true as const,
      permissions: ['download_resources', 'edit_components'] as Permission[],
    }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 cambio sin guardar')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(saveAction).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Confirmar cambio de permisos' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Sí, guardar permisos' }))

    expect(saveAction).toHaveBeenCalledWith({
      role: 'VISITOR',
      permissions: ['edit_components', 'download_resources'],
      previousPermissions: ['download_resources'],
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Permisos actualizados para Visitante.')
    expect(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' })).toBeChecked()
  })

  test('names every dirty role after a confirmed save', async () => {
    const saveAction = vi.fn(async ({ permissions }) => ({
      ok: true as const,
      permissions,
    }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    await user.click(screen.getByRole('checkbox', { name: 'Descargar recursos: Asistente' }))
    expect(screen.getByRole('status')).toHaveTextContent('2 cambios sin guardar')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText(/Visitante y Asistente/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Sí, guardar permisos' }))

    expect(saveAction).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Permisos actualizados para Visitante y Asistente.',
    )
  })

  test('cancels without writing the draft', async () => {
    const saveAction = vi.fn(async () => ({
      ok: true as const,
      permissions: [] as Permission[],
    }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await user.click(screen.getByRole('button', { name: 'No, cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saveAction).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' })).toBeChecked()
  })

  test('discards the draft without writing', async () => {
    const saveAction = vi.fn(async () => ({
      ok: true as const,
      permissions: [] as Permission[],
    }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    expect(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(saveAction).not.toHaveBeenCalled()
    expect(
      screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }),
    ).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  test('does not send administrator grants when a locked checkbox is clicked', async () => {
    const saveAction = vi.fn(async () => ({
      ok: true as const,
      permissions: [] as Permission[],
    }))
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    expect(
      screen.getByRole('checkbox', { name: 'Crear componentes: Persona administradora' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(saveAction).not.toHaveBeenCalled()
  })

  test('keeps the draft visible when the confirmed save is rejected', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason: 'conflict' as const }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Sí, guardar permisos' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Recarga la página/)
    expect(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' })).toBeChecked()
  })

  test('explains a lost session after confirmation', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason: 'unauthorized' as const }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Sí, guardar permisos' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/ya no tienes autorización/)
  })

  test('explains a locked administrator write after confirmation', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason: 'locked' as const }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Editar componentes: Visitante' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Sí, guardar permisos' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Los permisos de la persona administradora no se pueden cambiar.',
    )
  })
})
