import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { accountMenuCopy, signOutDialogCopy } from '@/app/lib/auth/account'

import { SignOutButton, type SignOutButtonProps } from './SignOutButton'
import { HeaderPill, SigningOut } from './SignOutButton.stories'

const headerArgs = HeaderPill.args as SignOutButtonProps
const signingOutArgs = SigningOut.args as SignOutButtonProps

const trigger = () => screen.getByRole('button', { name: accountMenuCopy.signOut })
const dialog = () => screen.getByRole('dialog', { name: signOutDialogCopy.title })

describe('SignOutButton', () => {
  test('asks for confirmation instead of signing out at once', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(trigger())

    expect(dialog()).toBeVisible()
    expect(dialog()).toHaveAccessibleDescription(signOutDialogCopy.body)
    expect(onSignOut).not.toHaveBeenCalled()
  })

  test('signs out only once confirmed', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    await user.click(trigger())
    await user.click(within(dialog()).getByRole('button', { name: signOutDialogCopy.confirm }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('cancelling keeps the session', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<SignOutButton {...headerArgs} onSignOut={onSignOut} />)

    await user.click(trigger())
    await user.click(within(dialog()).getByRole('button', { name: signOutDialogCopy.cancel }))

    expect(onSignOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('submits the enclosing form once confirmed when asked to', async () => {
    const user = userEvent.setup()
    const logoutAction = vi.fn().mockResolvedValue(undefined)
    render(
      <form action={logoutAction}>
        <SignOutButton className="button button-secondary" submitsForm />
      </form>,
    )

    await user.click(trigger())
    expect(logoutAction).not.toHaveBeenCalled()

    await user.click(within(dialog()).getByRole('button', { name: signOutDialogCopy.confirm }))

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
  })

  test('is disabled and says so while signing out', () => {
    render(<SignOutButton {...signingOutArgs} />)

    expect(screen.getByRole('button', { name: accountMenuCopy.signingOut })).toBeDisabled()
  })
})
