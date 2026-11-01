import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { shortName } from '@/app/lib/auth/account'
import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
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

// The edit mode is kept in `localStorage`, which outlives a test inside one file: start each from off.
beforeEach(() => {
  try {
    window.localStorage.clear()
  } catch {
    // Storage unavailable in this runtime: nothing was stored either.
  }
})

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
    renderWithIntl(
      <EditModeProvider>
        <AccountLinks {...signedInMobileAdminArgs} />
      </EditModeProvider>,
    )

    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute(
      'href',
      '/administracion',
    )
  })

  test('offers the "Modo edición" switch in the mobile menu to an editor, and it toggles', async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <EditModeProvider>
        <AccountLinks {...signedInMobileAdminArgs} />
      </EditModeProvider>,
    )

    await user.click(screen.getByRole('switch', { name: 'Modo edición' }))

    expect(screen.getByRole('switch', { name: 'Modo edición' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('hides the switch from a visitor in the mobile menu', () => {
    renderWithIntl(<AccountLinks {...signedInMobileArgs} />)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  test('labels the mobile switch in English', () => {
    renderWithIntl(
      <EditModeProvider>
        <AccountLinks {...signedInMobileAdminArgs} />
      </EditModeProvider>,
      { locale: 'en' },
    )

    expect(screen.getByRole('switch', { name: 'Edit mode' })).toBeInTheDocument()
  })
})
