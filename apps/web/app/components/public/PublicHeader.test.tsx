import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ACCOUNT_COOKIE, shortName } from '@/app/lib/auth/account'
import type { SessionCapabilitiesResponse } from '@/app/lib/auth/capabilities'
import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { PublicHeader } from './PublicHeader'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

type Role = 'VISITOR' | 'ASSISTANT' | 'ADMIN'

/**
 * Signs `name` in as far as the header can tell: the readable account cookie,
 * which may carry a forged `cookieRole`, plus what `GET /api/session` answers
 * for the real session. Only the latter may decide what the header offers.
 */
function signIn(name: string, sessionRole: Role, cookieRole?: Role) {
  const payload = cookieRole ? { name, role: cookieRole } : { name }
  document.cookie = `${ACCOUNT_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/`
  const privileged = sessionRole !== 'VISITOR'
  const body: SessionCapabilitiesResponse = {
    signedIn: true,
    name,
    role: sessionRole,
    canAccessAdmin: privileged,
    canEdit: privileged,
  }
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body)))
}

const fetchMock = vi.fn()

function renderHeader({
  locale,
  setLocaleAction = async () => undefined,
}: { locale?: Locale; setLocaleAction?: (locale: Locale) => Promise<void> } = {}) {
  return renderWithIntl(
    <EditModeProvider>
      <PublicHeader logoutAction={async () => undefined} setLocaleAction={setLocaleAction} />
    </EditModeProvider>,
    { locale },
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ signedIn: false } satisfies SessionCapabilitiesResponse)),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
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

  test('hides Administración from a signed-in visitor', async () => {
    signIn('Ana Pérez Rojas', 'VISITOR')
    renderHeader()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: /^Administración$/ })).not.toBeInTheDocument()
  })

  test.each(['ADMIN', 'ASSISTANT'] as const)(
    'ignores a forged %s role in the account cookie (LASCE-SEC-001)',
    async (forged) => {
      const user = userEvent.setup()
      signIn('Ana Pérez Rojas', 'VISITOR', forged)
      renderHeader()

      const trigger = screen.getByText(shortName('Ana Pérez Rojas'), { selector: 'summary' })
      await user.click(trigger)
      const menu = within(trigger.closest('details') as HTMLElement)
      // The server's answer arrives and says visitor.
      expect(await menu.findByText('Visitante')).toBeInTheDocument()
      expect(menu.queryByRole('link', { name: /^Administración$/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('switch', { name: 'Modo edición' })).not.toBeInTheDocument()
    },
  )

  test('shows Administración to an assistant and an administrator, only inside the account menu', async () => {
    const user = userEvent.setup()
    signIn('Carlos Solís', 'ASSISTANT')
    const { unmount } = renderHeader()

    expect(
      within(screen.getByRole('navigation', { name: 'Navegación principal' })).queryByRole('link', {
        name: /^Administración$/,
      }),
    ).not.toBeInTheDocument()

    const assistantTrigger = screen.getByText(shortName('Carlos Solís'), { selector: 'summary' })
    await user.click(assistantTrigger)
    expect(
      await within(assistantTrigger.closest('details') as HTMLElement).findByRole('link', {
        name: /^Administración$/,
      }),
    ).toHaveAttribute('href', '/administracion')
    unmount()

    signIn('Ana Pérez Rojas', 'ADMIN')
    renderHeader()

    const adminTrigger = screen.getByText(shortName('Ana Pérez Rojas'), { selector: 'summary' })
    await user.click(adminTrigger)
    expect(
      await within(adminTrigger.closest('details') as HTMLElement).findByRole('link', {
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
        ['Física Solar', '/fisica-solar'],
        ['Clima espacial', '/clima-espacial'],
        ['ROSAC', '/radioastronomia'],
      ],
    },
    {
      group: 'Divulgación',
      items: [
        ['Noticias', '/noticias'],
        ['Galería', '/galeria'],
        ['Actividades académicas', '/actividades-academicas'],
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
