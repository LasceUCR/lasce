import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { accountMenuCopy } from '@/app/lib/auth/account'

import { AccountLinks, type AccountLinksProps } from './AccountLinks'
import {
  SignedInHeader,
  SignedInMobile,
  SignedOutHeader,
  SignedOutMobile,
  SigningOutHeader,
} from './AccountLinks.stories'

const signedOutHeaderArgs = SignedOutHeader.args as AccountLinksProps
const signedInHeaderArgs = SignedInHeader.args as AccountLinksProps
const signingOutHeaderArgs = SigningOutHeader.args as AccountLinksProps
const signedOutMobileArgs = SignedOutMobile.args as AccountLinksProps
const signedInMobileArgs = SignedInMobile.args as AccountLinksProps

describe('AccountLinks', () => {
  test('offers sign-in before registration when signed out', () => {
    render(<AccountLinks {...signedOutHeaderArgs} />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      accountMenuCopy.signIn,
      accountMenuCopy.register,
    ])
    expect(links[0]).toHaveAttribute('href', '/login')
    expect(links[1]).toHaveAttribute('href', '/registro')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('greets the signed-in user, links to the account page and offers sign-out', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<AccountLinks {...signedInHeaderArgs} onSignOut={onSignOut} />)

    const greeting = screen.getByRole('link', { name: 'Hola, Ana' })
    expect(greeting).toHaveAttribute('href', '/cuenta')
    expect(greeting).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: accountMenuCopy.signIn })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: accountMenuCopy.signOut }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  test('disables the button and says so while signing out', () => {
    render(<AccountLinks {...signingOutHeaderArgs} />)

    expect(screen.getByRole('button', { name: accountMenuCopy.signingOut })).toBeDisabled()
  })

  test('marks the current page and closes the mobile menu when a link is followed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AccountLinks {...signedOutMobileArgs} onNavigate={onNavigate} />)

    const signIn = screen.getByRole('link', { name: accountMenuCopy.signIn })
    expect(signIn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: accountMenuCopy.register })).not.toHaveAttribute(
      'aria-current',
    )

    await user.click(signIn)

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  test('uses the plain account label in the mobile menu', () => {
    render(<AccountLinks {...signedInMobileArgs} />)

    expect(screen.getByRole('link', { name: accountMenuCopy.account })).toHaveAttribute(
      'href',
      '/cuenta',
    )
    expect(screen.getByRole('button', { name: accountMenuCopy.signOut })).toBeEnabled()
  })
})
