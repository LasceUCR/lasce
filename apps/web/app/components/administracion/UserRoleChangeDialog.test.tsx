import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRoleChangeDialog, type UserRoleChangeDialogProps } from './UserRoleChangeDialog'
import {
  Default,
  OwnRole,
  RemoveRole,
  SavePermissions,
  SaveSeveralRoles,
} from './UserRoleChangeDialog.stories'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

mockDialog()
const args = Default.args as UserRoleChangeDialogProps

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

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

  test('uses the permissions text it is given and reports a failure instead of showing it', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    render(
      <UserRoleChangeDialog
        {...(SavePermissions.args as UserRoleChangeDialogProps)}
        permissionsCopy={{
          title: 'Confirm permission change',
          question: 'Save the permissions of Assistant?',
          summary: 'It applies right away.',
          confirm: 'Yes, save permissions',
          cancel: 'No, cancel',
          savingStatus: 'Saving permission change…',
          savingButton: 'Saving…',
          reload: 'Reload page',
          unknownError: 'We could not confirm the change.',
        }}
        onError={onError}
        onConfirm={async () => {
          throw new Error('Unavailable')
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Confirm permission change' })).toBeInTheDocument()
    expect(screen.getByText('Save the permissions of Assistant?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, save permissions' }))

    expect(onError).toHaveBeenCalledWith('We could not confirm the change.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'No, cancel' })).toBeEnabled()
  })
})

describe('UserRoleChangeDialog in English', () => {
  test('asks to assign the role, and warns that the new role replaces the current one', () => {
    render(<UserRoleChangeDialog {...args} onClose={vi.fn()} />, 'en')

    expect(screen.getByRole('heading', { name: 'Confirm role change' })).toBeVisible()
    expect(screen.getByRole('dialog')).toHaveTextContent(
      `Do you want to assign the role ${args.role!.name} to ${args.user!.name}?`,
    )
    expect(screen.getByText(/Current role:/)).toBeVisible()
    expect(screen.getByText(/will not keep both roles/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'No, cancel' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Yes, change role' })).toBeVisible()
  })

  test('explains the removal and the self-removal warning in English', () => {
    render(<UserRoleChangeDialog {...(OwnRole.args as UserRoleChangeDialogProps)} />, 'en')

    expect(screen.getByRole('heading', { name: 'Confirm role removal' })).toBeVisible()
    expect(screen.getByText('The user will be left without an assigned role.')).toBeVisible()
    expect(screen.getByText(/You are changing your own role\./)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Yes, remove role' })).toBeVisible()
  })

  test('falls back to a translated reason when the failure has none, and stays open', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    const confirm = vi.fn(async () => {
      throw new Error('raw server message')
    })
    render(<UserRoleChangeDialog {...args} onConfirm={confirm} onClose={close} />, 'en')

    await user.click(screen.getByRole('button', { name: 'Yes, change role' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not confirm the change. Reload the page to check the current role before trying again.',
    )
    expect(screen.queryByText('raw server message')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeEnabled()
    expect(close).not.toHaveBeenCalled()
  })
})
