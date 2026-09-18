import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRoleChangeDialog, type UserRoleChangeDialogProps } from './UserRoleChangeDialog'
import {
  Default,
  RemoveRole,
  SavePermissions,
  SaveSeveralRoles,
} from './UserRoleChangeDialog.stories'

mockDialog()
const args = Default.args as UserRoleChangeDialogProps

describe('UserRoleChangeDialog', () => {
  test('describes the replacement, starts on cancel and allows Escape', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(<UserRoleChangeDialog {...args} onClose={close} />)
    expect(screen.getByRole('button', { name: 'No, cancelar' })).toHaveFocus()
    expect(screen.getByText(args.role!.description!)).toBeInTheDocument()
    expect(screen.getByText(/no conservará ambos roles/)).toBeInTheDocument()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Sí, cambiar rol' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'No, cancelar' })).toHaveFocus()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(close).toHaveBeenCalledOnce()
  })

  test('prevents repeated confirmation and dismissal during saving, then requires verification after failure', async () => {
    const user = userEvent.setup()
    let rejectSave!: (error: Error) => void
    const confirm = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject
        }),
    )
    const close = vi.fn()
    render(<UserRoleChangeDialog {...args} onConfirm={confirm} onClose={close} />)
    await user.dblClick(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'No, cancelar' })).toBeDisabled()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(close).not.toHaveBeenCalled()
    await act(async () => rejectSave(new Error('Unavailable')))
    expect(screen.getByRole('alert')).toHaveTextContent(/Recarga la/)
    expect(screen.getByRole('alert')).toHaveFocus()
    confirm.mockResolvedValueOnce()
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Recargar/ })).toBeEnabled()
  })

  test('explains removal without promising an automatic replacement role', () => {
    render(<UserRoleChangeDialog {...(RemoveRole.args as UserRoleChangeDialogProps)} />)
    expect(screen.getByText('El usuario quedará sin un rol asignado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, retirar rol' })).toBeInTheDocument()
  })

  test('names the roles whose permissions will be saved', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(
      <UserRoleChangeDialog
        {...(SavePermissions.args as UserRoleChangeDialogProps)}
        onClose={close}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Confirmar cambio de permisos' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Asistente/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, cancelar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Sí, guardar permisos' })).toHaveFocus()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(close).toHaveBeenCalledOnce()
  })

  test('lists several roles when more than one mapping changed', () => {
    render(<UserRoleChangeDialog {...(SaveSeveralRoles.args as UserRoleChangeDialogProps)} />)
    expect(screen.getByText(/Visitante y Asistente/)).toBeInTheDocument()
  })
})
