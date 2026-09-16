import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { RolePermissionsEditor } from './RolePermissionsEditor'
import meta from './RolePermissionsEditor.stories'
import type { RolePermissionsEditorProps } from './RolePermissionsEditor'

describe('persisted role permissions', () => {
  test('updates the selected role only after a successful save', async () => {
    const saveAction = vi.fn(async () => ({
      ok: true as const,
      permissions: ['download_resources', 'edit_components'] as const,
    }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Visitante' }))
    await user.click(screen.getByRole('checkbox', { name: /Editar componentes/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(saveAction).toHaveBeenCalledWith({
      role: 'VISITOR',
      permissions: ['download_resources', 'edit_components'],
      previousPermissions: ['download_resources'],
    })
    expect(screen.getByRole('status')).toHaveTextContent('Permisos actualizados para Visitante.')
    expect(screen.getByRole('checkbox', { name: /Editar componentes/ })).toBeChecked()
  })

  test('keeps the draft visible when the save is rejected', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason: 'conflict' as const }))
    const user = userEvent.setup()
    render(
      <RolePermissionsEditor
        {...(meta.args as RolePermissionsEditorProps)}
        saveAction={saveAction}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Visitante' }))
    await user.click(screen.getByRole('checkbox', { name: /Editar componentes/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: /Editar componentes/ })).toBeChecked()
  })
})
