import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

import { AdminShell, type AdminShellProps } from './AdminShell'
import { Default, NoGrants, PartialGrants } from './AdminShell.stories'

vi.mock('next/navigation', () => ({
  usePathname: () => '/administracion',
}))

const defaultArgs = Default.args as AdminShellProps

function renderShell(args: AdminShellProps = defaultArgs) {
  return render(
    <EditModeProvider>
      <AdminShell {...args} />
    </EditModeProvider>,
  )
}

function menu() {
  return within(screen.getByRole('navigation', { name: 'Panel de administración' }))
}

describe('AdminShell', () => {
  test('renders the admin navigation, its children and the edit mode toggle', () => {
    renderShell()

    expect(screen.getByRole('navigation', { name: 'Panel de administración' })).toBeInTheDocument()
    expect(screen.getByText('Contenido de la sección')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Modo edición' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  test('flips the shared edit mode state when the toggle is switched on', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('switch', { name: 'Modo edición' }))

    expect(screen.getByRole('switch', { name: 'Modo edición' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('shows every section when all grants are held', () => {
    renderShell()

    expect(
      menu()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Resumen', 'Descargas', 'Usuarios', 'Permisos', 'Infraestructura'])
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
})
