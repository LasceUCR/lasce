import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'

import { AdminShell, type AdminShellProps } from './AdminShell'
import { Default } from './AdminShell.stories'

vi.mock('next/navigation', () => ({
  usePathname: () => '/administracion',
}))

const defaultArgs = Default.args as AdminShellProps

function renderShell() {
  return render(
    <EditModeProvider>
      <AdminShell {...defaultArgs} />
    </EditModeProvider>,
  )
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
})
