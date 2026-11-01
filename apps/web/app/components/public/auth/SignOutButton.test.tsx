import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { SignOutButton, type SignOutButtonProps } from './SignOutButton'
import { HeaderPill, SigningOut } from './SignOutButton.stories'

const headerArgs = HeaderPill.args as SignOutButtonProps
const signingOutArgs = SigningOut.args as SignOutButtonProps

const trigger = () => screen.getByRole('button', { name: 'Cerrar sesión' })
const dialog = () => screen.getByRole('dialog', { name: '¿Cerrar sesión?' })

describe('SignOutButton', () => {
  test('asks for confirmation instead of signing out at once', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    renderWithIntl(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(trigger())

    expect(dialog()).toBeVisible()
    expect(dialog()).toHaveAccessibleDescription(
      'Tu sesión en este navegador terminará y tendrás que volver a ingresar.',
    )
    expect(onSignOut).not.toHaveBeenCalled()
  })

  test('signs out only once confirmed', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    renderWithIntl(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    await user.click(trigger())
    await user.click(within(dialog()).getByRole('button', { name: 'Cerrar sesión' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('cancelling keeps the session', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    renderWithIntl(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    await user.click(trigger())
    await user.click(within(dialog()).getByRole('button', { name: 'Cancelar' }))

    expect(onSignOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('submits the enclosing form once confirmed when asked to', async () => {
    const user = userEvent.setup()
    const logoutAction = vi.fn().mockResolvedValue(undefined)
    renderWithIntl(
      <form action={logoutAction}>
        <SignOutButton className="button button-secondary" submitsForm />
      </form>,
    )

    await user.click(trigger())
    expect(logoutAction).not.toHaveBeenCalled()

    await user.click(within(dialog()).getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
  })

  test('is disabled and says so while signing out', () => {
    renderWithIntl(<SignOutButton {...signingOutArgs} />)

    expect(screen.getByRole('button', { name: 'Cerrando sesión...' })).toBeDisabled()
  })
})
