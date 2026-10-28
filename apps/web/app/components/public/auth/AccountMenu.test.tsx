import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { shortName } from '@/app/lib/auth/account'
import { renderWithIntl } from '@/app/lib/i18n/testing'

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
    renderWithIntl(<AccountMenu {...visitorArgs} />)

    expect(details()).not.toHaveAttribute('open')
    expect(trigger()).toHaveTextContent(shortName(visitorArgs.account))
  })

  test('opens to show the name, role, "Mi cuenta" and "Cerrar sesión", but not "Administración" for a visitor', async () => {
    const user = userEvent.setup()
    renderWithIntl(<AccountMenu {...visitorArgs} />)

    await user.click(trigger())

    expect(details()).toHaveAttribute('open')
    expect(screen.getByText(visitorArgs.account, { selector: 'p' })).toBeVisible()
    expect(screen.getByText('Visitante')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
  })

  test('shows "Administración" for an administrator, linking to /administracion', () => {
    renderWithIntl(<AccountMenu {...adminArgs} />)

    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute(
      'href',
      '/administracion',
    )
  })

  test('signs out only after confirming', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    renderWithIntl(<AccountMenu {...openArgs} onSignOut={onSignOut} />)

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onSignOut).not.toHaveBeenCalled()

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar sesión' }),
    )

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  test('disables the sign-out control and says so while signing out', () => {
    renderWithIntl(<AccountMenu {...signingOutArgs} />)

    expect(screen.getByRole('button', { name: 'Cerrando sesión...' })).toBeDisabled()
  })

  test('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderWithIntl(<AccountMenu {...openArgs} />)

    screen.getByRole('link', { name: 'Mi cuenta' }).focus()
    await user.keyboard('{Escape}')

    expect(details()).not.toHaveAttribute('open')
    expect(trigger()).toHaveFocus()
  })

  test('closes on a pointer outside the group', () => {
    renderWithIntl(<AccountMenu {...openArgs} />)

    fireEvent.pointerDown(document.body)

    expect(details()).not.toHaveAttribute('open')
  })

  test('closes when focus leaves the group', async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <>
        <AccountMenu {...openArgs} />
        <a href="/noticias">Noticias</a>
      </>,
    )

    screen.getByRole('link', { name: 'Mi cuenta' }).focus()
    await user.tab()

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus()
    expect(details()).toHaveAttribute('open')
    await user.tab()

    expect(screen.getByRole('link', { name: 'Noticias' })).toHaveFocus()
    expect(details()).not.toHaveAttribute('open')
  })
})
