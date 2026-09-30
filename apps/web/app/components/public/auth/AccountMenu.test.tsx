import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { accountMenuCopy, shortName, signOutDialogCopy } from '@/app/lib/auth/account'

import { AccountMenu, type AccountMenuProps } from './AccountMenu'
import { Administrator, Open, SigningOut, Visitor } from './AccountMenu.stories'

const visitorArgs = Visitor.args as AccountMenuProps
const openArgs = Open.args as AccountMenuProps
const adminArgs = Administrator.args as AccountMenuProps
const signingOutArgs = SigningOut.args as AccountMenuProps

// The trigger's own text is the short name, same as NavGroup.test.tsx finds
// "Recursos" by its text; { selector: 'summary' } is needed only because the
// open panel repeats the full name, which would otherwise also match.
const trigger = () => screen.getByText(shortName(visitorArgs.account), { selector: 'summary' })
const details = () => trigger().closest('details') as HTMLDetailsElement

describe('AccountMenu', () => {
  test('shows the short name on the trigger, closed by default', () => {
    render(<AccountMenu {...visitorArgs} />)

    expect(details()).not.toHaveAttribute('open')
    expect(trigger()).toHaveTextContent(shortName(visitorArgs.account))
  })

  test('opens to show the name, role, "Mi cuenta" and "Cerrar sesión", but not "Administración" for a visitor', async () => {
    const user = userEvent.setup()
    render(<AccountMenu {...visitorArgs} />)

    await user.click(trigger())

    expect(details()).toHaveAttribute('open')
    expect(screen.getByText('Prueba')).toBeVisible()
    expect(screen.getByText('Visitante')).toBeVisible()
    expect(screen.getByRole('link', { name: accountMenuCopy.account })).toHaveAttribute(
      'href',
      '/cuenta',
    )
    expect(screen.getByRole('button', { name: accountMenuCopy.signOut })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: accountMenuCopy.administracion }),
    ).not.toBeInTheDocument()
  })

  test('shows "Administración" for an administrator, linking to /administracion', () => {
    render(<AccountMenu {...adminArgs} />)

    expect(screen.getByRole('link', { name: accountMenuCopy.administracion })).toHaveAttribute(
      'href',
      '/administracion',
    )
  })

  test('signs out only after confirming', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<AccountMenu {...openArgs} onSignOut={onSignOut} />)

    await user.click(screen.getByRole('button', { name: accountMenuCopy.signOut }))
    expect(onSignOut).not.toHaveBeenCalled()

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: signOutDialogCopy.confirm }),
    )

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  test('disables the sign-out control and says so while signing out', () => {
    render(<AccountMenu {...signingOutArgs} />)

    expect(screen.getByRole('button', { name: accountMenuCopy.signingOut })).toBeDisabled()
  })

  test('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<AccountMenu {...openArgs} />)

    screen.getByRole('link', { name: accountMenuCopy.account }).focus()
    await user.keyboard('{Escape}')

    expect(details()).not.toHaveAttribute('open')
    expect(trigger()).toHaveFocus()
  })

  test('closes on a pointer outside the group', () => {
    render(<AccountMenu {...openArgs} />)

    fireEvent.pointerDown(document.body)

    expect(details()).not.toHaveAttribute('open')
  })

  test('closes when focus leaves the group', async () => {
    const user = userEvent.setup()
    render(
      <>
        <AccountMenu {...openArgs} />
        <a href="/noticias">Noticias</a>
      </>,
    )

    screen.getByRole('link', { name: accountMenuCopy.account }).focus()
    await user.tab()

    expect(screen.getByRole('link', { name: 'Noticias' })).toHaveFocus()
    expect(details()).not.toHaveAttribute('open')
  })
})
