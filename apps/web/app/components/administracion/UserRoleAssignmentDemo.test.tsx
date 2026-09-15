import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRoleAssignmentDemo, type UserRoleAssignmentDemoProps } from './UserRoleAssignmentDemo'
import { Default, SaveFailure } from './UserRoleAssignmentDemo.stories'

mockDialog()

describe('UserRoleAssignmentDemo', () => {
  test('replaces rather than combines roles and leaves other users unchanged', async () => {
    const user = userEvent.setup()
    render(<UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />)
    const ana = within(screen.getByRole('row', { name: /ana@example.com/ }))
    await user.click(ana.getByRole('checkbox', { name: /^Visitante:/ }))
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    await screen.findByText('Rol actualizado para Ana Ejemplo: Visitante.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(ana.getByRole('checkbox', { name: /^Visitante:/ })).toBeChecked()
    expect(ana.getByRole('checkbox', { name: /^Administrador:/ })).not.toBeChecked()
    expect(ana.getByRole('checkbox', { name: /^Asistente:/ })).not.toBeChecked()
    const luis = within(screen.getByRole('row', { name: /luis@example.com/ }))
    expect(luis.getByRole('checkbox', { name: /^Asistente:/ })).toBeChecked()
    await user.click(ana.getByRole('checkbox', { name: /^Visitante:/ }))
    await user.click(screen.getByRole('button', { name: 'Sí, retirar rol' }))
    await screen.findByText('Rol retirado de Ana Ejemplo.')
    for (const checkbox of ana.getAllByRole('checkbox')) expect(checkbox).not.toBeChecked()
  })

  test('assigns a role to an unassigned user and resets mock data on remount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />,
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    )
    expect(screen.getByText('Rol actual: Sin rol')).toBeInTheDocument()
    expect(screen.getByText('Puede editar el contenido de la página.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    await screen.findByText('Rol actualizado para Carlos Ejemplo: Asistente.')
    await user.type(screen.getByRole('searchbox'), 'inexistente')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    expect(
      screen.getByRole('checkbox', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    ).toBeChecked()
    unmount()
    render(<UserRoleAssignmentDemo {...(Default.args as UserRoleAssignmentDemoProps)} />)
    expect(
      screen.getByRole('checkbox', { name: 'Asistente: Carlos Ejemplo (carlos@example.com)' }),
    ).not.toBeChecked()
  })

  test('keeps the previous role when saving fails and lets the user cancel', async () => {
    const user = userEvent.setup()
    render(<UserRoleAssignmentDemo {...(SaveFailure.args as UserRoleAssignmentDemoProps)} />)
    const visitor = screen.getByRole('checkbox', {
      name: 'Visitante: Ana Ejemplo (ana@example.com)',
    })
    const admin = screen.getByRole('checkbox', {
      name: 'Administrador: Ana Ejemplo (ana@example.com)',
    })
    await user.click(visitor)
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos confirmar el cambio')
    expect(admin).toBeChecked()
    expect(visitor).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'No, cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
