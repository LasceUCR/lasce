import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, encodeAccountCookie, shortName } from '@/app/lib/auth/account'

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
    expect(document.querySelector('details.account-menu')).not.toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Ingresar' })) {
      expect(link).toHaveAttribute('href', '/acceso')
    }
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

  test('shows Administración to an assistant and an administrator, only inside the account menu', async () => {
    const user = userEvent.setup()
    setAccountCookie('Carlos Solís', 'ASSISTANT')
    const { unmount } = render(<PublicHeader logoutAction={async () => undefined} />)

    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' })).queryByRole('link', {
        name: /^Administración$/,
      }),
    ).not.toBeInTheDocument()

    const assistantTrigger = screen.getByText(shortName('Carlos Solís'), { selector: 'summary' })
    await user.click(assistantTrigger)
    expect(
      within(assistantTrigger.closest('details') as HTMLElement).getByRole('link', {
        name: /^Administración$/,
      }),
    ).toHaveAttribute('href', '/administracion')
    unmount()

    setAccountCookie('Ana Pérez Rojas', 'ADMIN')
    render(<PublicHeader logoutAction={async () => undefined} />)

    const adminTrigger = screen.getByText(shortName('Ana Pérez Rojas'), { selector: 'summary' })
    await user.click(adminTrigger)
    expect(
      within(adminTrigger.closest('details') as HTMLElement).getByRole('link', {
        name: /^Administración$/,
      }),
    ).toHaveAttribute('href', '/administracion')
  })

  test('identifies UCR, CINESPA and LASCE in the header brand', () => {
    render(<PublicHeader logoutAction={async () => undefined} />)

    expect(screen.getByAltText('Universidad de Costa Rica')).toBeInTheDocument()
    expect(screen.getByAltText('Centro de Investigaciones Espaciales')).toBeInTheDocument()
    expect(screen.getByAltText('Laboratorio de Ciencias Espaciales')).toBeInTheDocument()
  })

  test('groups the resource pages behind Recursos on desktop, and behind an accordion on mobile', async () => {
    const user = userEvent.setup()
    render(<PublicHeader logoutAction={async () => undefined} />)

    await user.click(screen.getByLabelText('Abrir navegación'))

    const desktop = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    const mobile = within(screen.getByRole('navigation', { name: 'Navegación móvil' }))
    const grouped = ['Publicaciones', 'Herramientas científicas', 'Galería']

    // Both start closed: Recursos reads like a normal item on mobile, not a heading.
    for (const label of grouped) {
      expect(desktop.getByRole('link', { name: label })).not.toBeVisible()
      expect(mobile.getByRole('link', { name: label })).not.toBeVisible()
    }
    expect(mobile.queryByRole('button', { name: 'Recursos' })).not.toBeInTheDocument()

    await user.click(mobile.getByText('Recursos'))

    for (const label of grouped) {
      expect(mobile.getByRole('link', { name: label })).toBeVisible()
    }
    expect(mobile.getByRole('link', { name: 'Galería' })).toHaveAttribute('href', '/galeria')

    await user.click(desktop.getByText('Recursos'))

    for (const label of grouped) {
      expect(desktop.getByRole('link', { name: label })).toBeVisible()
    }
    expect(desktop.getByRole('link', { name: 'Galería' })).toHaveAttribute('href', '/galeria')
    expect(desktop.getByRole('link', { name: 'Datos' })).toBeVisible()
  })

  test('groups the about pages behind Nosotros on desktop, and behind an accordion on mobile', async () => {
    const user = userEvent.setup()
    render(<PublicHeader logoutAction={async () => undefined} />)

    await user.click(screen.getByLabelText('Abrir navegación'))

    const desktop = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    const mobile = within(screen.getByRole('navigation', { name: 'Navegación móvil' }))
    const grouped = ['Quiénes somos', 'Colaboraciones e Iniciativas']

    for (const label of grouped) {
      expect(desktop.getByRole('link', { name: label })).not.toBeVisible()
      expect(mobile.getByRole('link', { name: label })).not.toBeVisible()
    }
    expect(mobile.queryByRole('button', { name: 'Nosotros' })).not.toBeInTheDocument()
    expect(desktop.queryByRole('link', { name: 'Nosotros' })).not.toBeInTheDocument()

    await user.click(mobile.getByText('Nosotros'))

    expect(mobile.getByRole('link', { name: 'Quiénes somos' })).toBeVisible()
    expect(mobile.getByRole('link', { name: 'Quiénes somos' })).toHaveAttribute('href', '/nosotros')
    expect(mobile.getByRole('link', { name: 'Colaboraciones e Iniciativas' })).toHaveAttribute(
      'href',
      '/colaboraciones-e-iniciativas',
    )

    await user.click(desktop.getByText('Nosotros'))

    expect(desktop.getByRole('link', { name: 'Quiénes somos' })).toBeVisible()
    expect(desktop.getByRole('link', { name: 'Quiénes somos' })).toHaveAttribute(
      'href',
      '/nosotros',
    )
    expect(desktop.getByRole('link', { name: 'Colaboraciones e Iniciativas' })).toHaveAttribute(
      'href',
      '/colaboraciones-e-iniciativas',
    )
  })
})
