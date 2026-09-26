import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    expect(screen.queryByRole('link', { name: /^Administración$/ })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', {
        name: /^Contacto$/,
      }),
    ).toBeInTheDocument()
  })

  test('hides Administración from a signed-in visitor', () => {
    setAccountCookie('Ana Pérez Rojas', 'VISITOR')
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(screen.queryByRole('link', { name: /^Administración$/ })).not.toBeInTheDocument()
  })

  test('shows Administración to an assistant and an administrator', () => {
    setAccountCookie('Carlos Solís', 'ASSISTANT')
    const { unmount } = render(<PublicHeader logoutAction={async () => undefined} />)

    expect(screen.getAllByRole('link', { name: /^Administración$/ }).length).toBeGreaterThan(0)
    unmount()

    setAccountCookie('Ana Pérez Rojas', 'ADMIN')
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(screen.getAllByRole('link', { name: /^Administración$/ }).length).toBeGreaterThan(0)
  })

  test('groups the resource pages behind Recursos on desktop and lists them flat on mobile', async () => {
    const user = userEvent.setup()
    render(<PublicHeader logoutAction={async () => undefined} />)

    const desktop = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    const mobile = within(screen.getByRole('navigation', { name: 'Navegación móvil' }))
    const grouped = ['Publicaciones', 'Herramientas científicas', 'Galería']

    for (const label of grouped) {
      expect(desktop.getByRole('link', { name: label })).not.toBeVisible()
      expect(mobile.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(mobile.queryByText('Recursos')).not.toBeInTheDocument()

    await user.click(desktop.getByText('Recursos'))

    for (const label of grouped) {
      expect(desktop.getByRole('link', { name: label })).toBeVisible()
    }
    expect(desktop.getByRole('link', { name: 'Galería' })).toHaveAttribute('href', '/galeria')
    expect(desktop.getByRole('link', { name: 'Datos' })).toBeVisible()
  })
})
