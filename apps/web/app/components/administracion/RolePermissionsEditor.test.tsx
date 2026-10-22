import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Permission } from '@/app/lib/auth/permissions'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'

import { RolePermissionsEditor } from './RolePermissionsEditor'
import meta, { English } from './RolePermissionsEditor.stories'
import type { RolePermissionsEditorProps } from './RolePermissionsEditor'

mockDialog()

/** The editor as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

function dialog() {
  return screen.getByRole('dialog')
}

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
    expect(await screen.findByText('Permisos actualizados para Visitante.')).toBeInTheDocument()
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
    expect(
      await screen.findByText('Permisos actualizados para Visitante y Asistente.'),
    ).toBeInTheDocument()
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
      screen.getByRole('checkbox', {
        name: 'Crear componentes: Persona administradora (no se puede cambiar)',
      }),
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

    expect(
      within(dialog()).getByText(
        'La información de este rol cambió. Recarga la página antes de volver a guardarlo.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: 'Recargar página' })).toBeEnabled()
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

    expect(within(dialog()).getByText(/ya no tienes autorización/)).toBeInTheDocument()
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

    expect(
      within(dialog()).getByText('Los permisos de la persona administradora no se pueden cambiar.'),
    ).toBeInTheDocument()
  })

  test('falls back to a translated explanation when a failure gives no reason', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const }))
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

    expect(within(dialog()).getByText(/No pudimos confirmar el cambio/)).toBeInTheDocument()
  })

  test('reports an unexpected failure with the same fallback, keeping the dialog open', async () => {
    const saveAction = vi.fn(async () => {
      throw new Error('Network down')
    })
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

    expect(within(dialog()).getByText(/No pudimos confirmar el cambio/)).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: 'No, cancelar' })).toBeEnabled()
  })
})

describe('persisted role permissions in English', () => {
  const englishArgs = { ...meta.args, ...English.args } as RolePermissionsEditorProps

  test('confirms and saves in English, with an English list of roles and toast', async () => {
    const saveAction = vi.fn(async ({ permissions }) => ({ ok: true as const, permissions }))
    const user = userEvent.setup()
    render(<RolePermissionsEditor {...englishArgs} saveAction={saveAction} />, 'en')

    await user.click(screen.getByRole('checkbox', { name: 'Edit components: Visitor' }))
    await user.click(screen.getByRole('checkbox', { name: 'Download resources: Assistant' }))
    expect(screen.getByRole('status')).toHaveTextContent('2 unsaved changes')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      within(dialog()).getByRole('heading', { name: 'Confirm permission change' }),
    ).toBeVisible()
    expect(dialog()).toHaveTextContent(
      'Do you want to save the permissions of Visitor and Assistant?',
    )
    expect(within(dialog()).getByText('Visitor and Assistant').tagName).toBe('STRONG')
    expect(within(dialog()).getByRole('button', { name: 'No, cancel' })).toHaveFocus()
    await user.click(within(dialog()).getByRole('button', { name: 'Yes, save permissions' }))

    expect(saveAction).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByText('Permissions updated for Visitor and Assistant.'),
    ).toBeInTheDocument()
  })

  test('shows the permission descriptions in English', () => {
    render(<RolePermissionsEditor {...englishArgs} />, 'en')

    expect(screen.getByText('View accounts and assign or remove roles.')).toBeInTheDocument()
  })

  test('cancels in English without writing', async () => {
    const saveAction = vi.fn()
    const user = userEvent.setup()
    render(<RolePermissionsEditor {...englishArgs} saveAction={saveAction} />, 'en')

    await user.click(screen.getByRole('checkbox', { name: 'Edit components: Visitor' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: 'No, cancel' }))

    expect(saveAction).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: 'Edit components: Visitor' })).toBeChecked()
  })

  test('explains a failure in English, offering a reload', async () => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason: 'conflict' as const }))
    const user = userEvent.setup()
    render(<RolePermissionsEditor {...englishArgs} saveAction={saveAction} />, 'en')

    await user.click(screen.getByRole('checkbox', { name: 'Edit components: Visitor' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: 'Yes, save permissions' }))

    expect(
      within(dialog()).getByText(
        "This role's information changed. Reload the page before saving it again.",
      ),
    ).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: 'Reload page' })).toBeEnabled()
    expect(within(dialog()).getByRole('button', { name: 'Yes, save permissions' })).toBeDisabled()
  })
})
