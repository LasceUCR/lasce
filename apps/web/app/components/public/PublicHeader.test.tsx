import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, encodeAccountCookie, shortName } from '@/app/lib/auth/account'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { PublicHeader } from './PublicHeader'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

function setAccountCookie(name: string, role: 'VISITOR' | 'ASSISTANT' | 'ADMIN' | null) {
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(encodeAccountCookie({ name, role }))}; Path=/`
}

function renderHeader({
  locale,
  setLocaleAction = async () => undefined,
}: { locale?: Locale; setLocaleAction?: (locale: Locale) => Promise<void> } = {}) {
  return renderWithIntl(
    <PublicHeader logoutAction={async () => undefined} setLocaleAction={setLocaleAction} />,
    { locale },
  )
}

afterEach(() => {
  document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/`
})

describe('PublicHeader', () => {
  test('closes on touch outside even before the native toggle notification', () => {
    renderHeader()
    const trigger = screen.getByLabelText('Abrir navegación')
    const disclosure = trigger.closest('details')!
    disclosure.open = true
    fireEvent.touchStart(trigger)
    expect(disclosure.open).toBe(true)
    fireEvent.touchStart(document.body)
    expect(disclosure.open).toBe(false)
  })

  test('hides Administración when nobody is signed in', () => {
    renderHeader()

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
    renderHeader()

    expect(screen.queryByRole('link', { name: /^Administración$/ })).not.toBeInTheDocument()
  })

  test('shows Administración to an assistant and an administrator, only inside the account menu', async () => {
    const user = userEvent.setup()
    setAccountCookie('Carlos Solís', 'ASSISTANT')
    const { unmount } = renderHeader()

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
    renderHeader()

    const adminTrigger = screen.getByText(shortName('Ana Pérez Rojas'), { selector: 'summary' })
    await user.click(adminTrigger)
    expect(
      within(adminTrigger.closest('details') as HTMLElement).getByRole('link', {
        name: /^Administración$/,
      }),
    ).toHaveAttribute('href', '/administracion')
  })

  test('identifies UCR, CINESPA and LASCE in the header brand', () => {
    renderHeader()

    expect(screen.getByAltText('Universidad de Costa Rica')).toBeInTheDocument()
    expect(screen.getByAltText('Centro de Investigaciones Espaciales')).toBeInTheDocument()
    expect(screen.getByAltText('Laboratorio de Ciencias Espaciales')).toBeInTheDocument()
  })

  test.each([
    {
      group: 'Investigación',
      items: [
        ['Áreas de investigación', '/investigacion'],
        ['Física solar', '/fisica-solar'],
        ['Clima espacial', '/clima-espacial'],
        ['ROSAC', '/radioastronomia'],
      ],
    },
    {
      group: 'Divulgación',
      items: [
        ['Noticias', '/noticias'],
        ['Galería', '/galeria'],
      ],
    },
    {
      group: 'Recursos',
      items: [
        ['Publicaciones', '/publicaciones'],
        ['Herramientas científicas', '/herramientas-cientificas'],
      ],
    },
  ])(
    'groups the $group pages behind a disclosure on desktop, and behind an accordion on mobile',
    async ({ group, items }) => {
      const user = userEvent.setup()
      renderHeader()

      await user.click(screen.getByLabelText('Abrir navegación'))

      const desktop = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
      const mobile = within(screen.getByRole('navigation', { name: 'Navegación móvil' }))

      // Both start closed: the group reads like a normal item on mobile, not a heading.
      for (const [label] of items) {
        expect(desktop.getByRole('link', { name: label })).not.toBeVisible()
        expect(mobile.getByRole('link', { name: label })).not.toBeVisible()
      }
      expect(mobile.queryByRole('button', { name: group })).not.toBeInTheDocument()
      expect(desktop.queryByRole('link', { name: group })).not.toBeInTheDocument()

      await user.click(mobile.getByText(group))

      for (const [label, href] of items) {
        expect(mobile.getByRole('link', { name: label })).toBeVisible()
        expect(mobile.getByRole('link', { name: label })).toHaveAttribute('href', href)
      }

      await user.click(desktop.getByText(group))

      for (const [label, href] of items) {
        expect(desktop.getByRole('link', { name: label })).toBeVisible()
        expect(desktop.getByRole('link', { name: label })).toHaveAttribute('href', href)
      }
      expect(desktop.getByRole('link', { name: 'Datos' })).toBeVisible()
    },
  )

  test('links every page from the header exactly once', () => {
    renderHeader()

    for (const name of ['Navegación principal', 'Navegación móvil']) {
      const hrefs = within(screen.getByRole('navigation', { name }))
        .getAllByRole('link', { hidden: true })
        .map((link) => link.getAttribute('href'))
        .filter((href) => href !== '/acceso')

      expect(new Set(hrefs).size).toBe(hrefs.length)
      expect(hrefs).toEqual(
        expect.arrayContaining([
          '/fisica-solar',
          '/clima-espacial',
          '/radioastronomia',
          '/herramientas-cientificas',
          '/datos',
          '/noticias',
        ]),
      )
    }
  })

  test('groups the about pages behind Nosotros on desktop, and behind an accordion on mobile', async () => {
    const user = userEvent.setup()
    renderHeader()

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

  test('labels the navigation in English when the page is rendered in English', () => {
    renderHeader({ locale: 'en' })

    const desktop = within(screen.getByRole('navigation', { name: 'Main navigation' }))

    expect(desktop.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(desktop.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/datos')
    expect(desktop.getByRole('link', { name: 'Space weather', hidden: true })).toHaveAttribute(
      'href',
      '/clima-espacial',
    )
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull()
  })

  test('offers the language choice in the header and in the mobile menu, on the current one', () => {
    renderHeader({ locale: 'en' })

    expect(screen.getByLabelText('Language: English')).toHaveTextContent('EN')
    expect(screen.getByRole('combobox', { name: 'Language', hidden: true })).toHaveValue('en')
  })

  test('stores the language the visitor chooses from the header menu', async () => {
    const user = userEvent.setup()
    const setLocaleAction = vi.fn(async () => undefined)
    renderHeader({ setLocaleAction })

    await user.click(screen.getByLabelText('Idioma: Español'))
    await user.click(screen.getByRole('button', { name: 'English' }))

    await waitFor(() => expect(setLocaleAction).toHaveBeenCalledExactlyOnceWith('en'))
  })

  test('stores the language the visitor chooses from the mobile menu', async () => {
    const user = userEvent.setup()
    const setLocaleAction = vi.fn(async () => undefined)
    renderHeader({ setLocaleAction })

    await user.click(screen.getByLabelText('Abrir navegación'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'English')

    await waitFor(() => expect(setLocaleAction).toHaveBeenCalledExactlyOnceWith('en'))
  })
})
