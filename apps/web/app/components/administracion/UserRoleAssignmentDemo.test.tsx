import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRoleAssignmentDemo, type UserRoleAssignmentDemoProps } from './UserRoleAssignmentDemo'
import { Default, SaveFailure } from './UserRoleAssignmentDemo.stories'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

mockDialog()

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

describe('UserRoleAssignmentDemo', () => {
  test('replaces rather than combines roles and leaves other users unchanged', async () => {
    const user = userEvent.setup()
    render(<UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />)
    const ana = within(screen.getByRole('row', { name: /ana@example.com/ }))
    await user.click(ana.getByRole('radio', { name: /^Visitante:/ }))
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    await screen.findByText('Rol actualizado para Ana Ejemplo: Visitante.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(ana.getByRole('radio', { name: /^Visitante:/ })).toBeChecked()
    expect(ana.getByRole('radio', { name: /^Administrador:/ })).not.toBeChecked()
    expect(ana.getByRole('radio', { name: /^Asistente:/ })).not.toBeChecked()
    const luis = within(screen.getByRole('row', { name: /luis@example.com/ }))
    expect(luis.getByRole('radio', { name: /^Asistente:/ })).toBeChecked()
    await user.click(ana.getByRole('radio', { name: /^Sin rol:/ }))
    await user.click(screen.getByRole('button', { name: 'Sí, retirar rol' }))
    await screen.findByText('Rol retirado de Ana Ejemplo.')
    expect(ana.getByRole('radio', { name: /^Sin rol:/ })).toBeChecked()
    expect(ana.getByRole('radio', { name: /^Visitante:/ })).not.toBeChecked()
  })

  test('assigns a role to an unassigned user and resets mock data on remount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />,
    )
    await user.click(
      screen.getByRole('radio', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    )
    expect(screen.getByText('Rol actual: Sin rol')).toBeInTheDocument()
    expect(screen.getByText('Puede editar el contenido de la página.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    await screen.findByText('Rol actualizado para Carlos Ejemplo: Asistente.')
    await user.type(screen.getByRole('searchbox'), 'inexistente')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    expect(
      screen.getByRole('radio', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    ).toBeChecked()
    unmount()
    render(<UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />)
    expect(
      screen.getByRole('radio', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    ).not.toBeChecked()
  })

  test('keeps the previous role when saving fails and lets the user cancel', async () => {
    const user = userEvent.setup()
    render(<UserRoleAssignmentDemo {...(SaveFailure.args as UserRoleAssignmentDemoProps)} />)
    const visitor = screen.getByRole('radio', {
      name: 'Visitante: Ana Ejemplo (ana@example.com)',
    })
    const admin = screen.getByRole('radio', {
      name: 'Administrador: Ana Ejemplo (ana@example.com)',
    })
    await user.click(visitor)
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    expect(await screen.findByText(/No pudimos confirmar el cambio/)).toBeVisible()
    expect(admin).toBeChecked()
    expect(visitor).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'No, cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
