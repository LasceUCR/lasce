import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, encodeAccountCookie } from '@/app/lib/auth/account'

import { PublicHeader } from './PublicHeader'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

function setAccountCookie(name: string, role: 'VISITOR' | 'ASSISTANT' | 'ADMIN' | null) {
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(encodeAccountCookie({ name, role }))}; Path=/`
}

afterEach(() => {
  document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/`
})

describe('PublicHeader', () => {
  test('hides Administración when nobody is signed in', () => {
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(
      screen.queryByRole('link', { name: /^Administración$/ }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', {
        name: /^Contacto$/,
      }),
    ).toBeInTheDocument()
  })

  test('hides Administración from a signed-in visitor', () => {
    setAccountCookie('Ana Pérez Rojas', 'VISITOR')
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(
      screen.queryByRole('link', { name: /^Administración$/ }),
    ).not.toBeInTheDocument()
  })

  test('shows Administración to an assistant and an administrator', () => {
    setAccountCookie('Carlos Solís', 'ASSISTANT')
    const { unmount } = render(<PublicHeader logoutAction={async () => undefined} />)

    expect(
      screen.getAllByRole('link', { name: /^Administración$/ }).length,
    ).toBeGreaterThan(0)
    unmount()

    setAccountCookie('Ana Pérez Rojas', 'ADMIN')
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(
      screen.getAllByRole('link', { name: /^Administración$/ }).length,
    ).toBeGreaterThan(0)
  })
})
