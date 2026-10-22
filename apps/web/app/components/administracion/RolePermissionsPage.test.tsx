import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { RolePermissionsPage, type RolePermissionsPageProps } from './RolePermissionsPage'
import meta, { English, ErrorState, PendingChanges } from './RolePermissionsPage.stories'

const defaultArgs = meta.args as RolePermissionsPageProps
const englishArgs = { ...defaultArgs, ...English.args } as RolePermissionsPageProps

function render(ui: ReactElement) {
  return renderWithIntl(ui)
}

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

  test('shows what each permission allows under its name', () => {
    render(<RolePermissionsPage {...defaultArgs} />)

    const row = screen.getByRole('row', { name: /^Configurar permisos/ })
    expect(
      within(row).getByText('Ver y cambiar los permisos asociados a cada rol.'),
    ).toBeInTheDocument()
  })

  test('says under the administrator column that it cannot be changed', () => {
    render(<RolePermissionsPage {...defaultArgs} />)

    expect(
      screen.getByRole('columnheader', { name: /^Persona administradora\s*No se puede cambiar$/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Visitante' })).toBeInTheDocument()
  })

  test('counts a single pending change in the singular', () => {
    render(<RolePermissionsPage {...defaultArgs} pendingChanges={1} />)

    expect(screen.getByRole('status')).toHaveTextContent('1 cambio sin guardar')
  })
})

describe('RolePermissionsPage in English', () => {
  test('shows its headings, columns, roles, permissions and buttons in English', () => {
    renderWithIntl(<RolePermissionsPage {...englishArgs} />, { locale: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Permissions' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Permissions by role' })).toHaveAccessibleDescription(
      /Each checkbox shows whether the role can perform that action/,
    )
    expect(screen.getByRole('region', { name: 'Permissions by role table' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Permission' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /^Administrator\s*Cannot be changed$/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Download data from the GOES satellites.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  test('names every checkbox after its permission and role, in English', () => {
    renderWithIntl(<RolePermissionsPage {...englishArgs} />, { locale: 'en' })

    expect(screen.getByRole('checkbox', { name: 'Edit components: Assistant' })).toBeChecked()
    expect(
      screen.getByRole('checkbox', {
        name: 'Configure permissions: Administrator (cannot be changed)',
      }),
    ).toBeDisabled()
  })

  test('announces pending changes with English plurals', () => {
    const { rerender } = renderWithIntl(<RolePermissionsPage {...englishArgs} />, {
      locale: 'en',
    })

    expect(screen.getByRole('status')).toHaveTextContent('1 unsaved change')
    expect(screen.getByText('You have permission changes that have not been saved.')).toBeVisible()
    expect(screen.getByRole('row', { name: /Edit components, unsaved/ })).toBeInTheDocument()

    rerender(<RolePermissionsPage {...englishArgs} pendingChanges={3} />)

    expect(screen.getByRole('status')).toHaveTextContent('3 unsaved changes')
  })

  test('shows no Spanish text and no raw message keys', () => {
    const { container } = renderWithIntl(<RolePermissionsPage {...englishArgs} />, {
      locale: 'en',
    })

    expect(container).not.toHaveTextContent(/administration\.|access\./)
    expect(container).not.toHaveTextContent(
      /Permiso|Guardar|Descartar|Visitante|Asistente|cambio|sin guardar/,
    )
  })
})
