import { screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AdminShell, type AdminShellProps } from './AdminShell'
import { Default, NoGrants, PartialGrants } from './AdminShell.stories'

vi.mock('next/navigation', () => ({
  usePathname: () => '/administracion',
}))

const defaultArgs = Default.args as AdminShellProps

function renderShell(args: AdminShellProps = defaultArgs) {
  return renderWithIntl(
    <EditModeProvider>
      <AdminShell {...args} />
    </EditModeProvider>,
  )
}

function menu() {
  return within(screen.getByRole('navigation', { name: 'Panel de administración' }))
}

describe('AdminShell', () => {
  test('renders the admin navigation and its children, without the edit mode switch', () => {
    renderShell()

    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument()
    expect(screen.getByText('Contenido de la sección')).toBeInTheDocument()
    // The switch lives in the account menu now, so there is a single place to change it.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  test('shows every section when all grants are held', () => {
    renderShell()

    expect(
      menu()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Resumen', 'Descargas', 'Usuarios', 'Permisos', 'Auditoría', 'Infraestructura'])
  })

  test('hides the sections whose grant is missing', () => {
    renderShell(PartialGrants.args as AdminShellProps)

    expect(menu().queryByRole('link', { name: 'Usuarios' })).toBeNull()
    expect(menu().queryByRole('link', { name: 'Permisos' })).toBeNull()
    expect(menu().getByRole('link', { name: 'Descargas' })).toBeInTheDocument()
  })

  test('keeps the public sections for an account without grants', () => {
    renderShell(NoGrants.args as AdminShellProps)

    expect(
      menu()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Resumen', 'Infraestructura'])
  })

  test('speaks English when the site does', () => {
    renderWithIntl(
      <EditModeProvider>
        <AdminShell {...defaultArgs} />
      </EditModeProvider>,
      { locale: 'en' },
    )

    const nav = within(screen.getByRole('navigation', { name: 'Administration panel' }))
    expect(nav.getByRole('link', { name: 'Summary' })).toBeInTheDocument()
    expect(nav.getByRole('button', { name: /Menu/ })).toBeInTheDocument()
  })
})
