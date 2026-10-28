import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { shortName } from '@/app/lib/auth/account'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AccountLinks, type AccountLinksProps } from './AccountLinks'
import {
  SignedInHeader,
  SignedInMobile,
  SignedInMobileAdmin,
  SignedOutHeader,
  SignedOutMobile,
} from './AccountLinks.stories'

const signedOutHeaderArgs = SignedOutHeader.args as AccountLinksProps
const signedInHeaderArgs = SignedInHeader.args as AccountLinksProps
const signedOutMobileArgs = SignedOutMobile.args as AccountLinksProps
const signedInMobileArgs = SignedInMobile.args as AccountLinksProps
const signedInMobileAdminArgs = SignedInMobileAdmin.args as AccountLinksProps

describe('AccountLinks', () => {
  test('offers sign-in only when signed out, on the desktop header', () => {
    renderWithIntl(<AccountLinks {...signedOutHeaderArgs} />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Ingresar'])
    expect(links[0]).toHaveAttribute('href', '/acceso')
    expect(document.querySelector('details.account-menu')).not.toBeInTheDocument()
  })

  test('renders the compact account menu on the desktop header when signed in', () => {
    renderWithIntl(<AccountLinks {...signedInHeaderArgs} />)

    expect(
      screen.getByText(shortName(signedInHeaderArgs.account as string), { selector: 'summary' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
    // The greeting/sign-out pair this used to render directly no longer exists here;
    // AccountMenu.test.tsx covers what is now behind the trigger.
    expect(screen.queryByText(/^Hola, /)).not.toBeInTheDocument()
  })

  test('marks the current page and closes the mobile menu when a link is followed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderWithIntl(<AccountLinks {...signedOutMobileArgs} onNavigate={onNavigate} />)

    const signIn = screen.getByRole('link', { name: 'Ingresar' })
    expect(signIn).toHaveAttribute('aria-current', 'page')
    expect(signIn).toHaveClass('active')

    await user.click(signIn)

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  test('uses the plain account label in the mobile menu, without Administración for a visitor', () => {
    renderWithIntl(<AccountLinks {...signedInMobileArgs} />)

    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
  })

  test('offers Administración in the mobile menu for an authorized role', () => {
    renderWithIntl(<AccountLinks {...signedInMobileAdminArgs} />)

    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute(
      'href',
      '/administracion',
    )
  })
})
