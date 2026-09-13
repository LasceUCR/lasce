import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { UsersOverviewPage, type UsersOverviewPageProps } from './UsersOverviewPage'
import { Demo, Empty, NoRoles } from './UsersOverviewPage.stories'

const args = Demo.args as UsersOverviewPageProps

describe('UsersOverviewPage', () => {
  test('reflects updated input data while keeping the current search', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<UsersOverviewPage {...args} />)
    await user.type(screen.getByRole('searchbox'), 'ana@')
    rerender(
      <UsersOverviewPage
        {...args}
        isDemo={false}
        users={args.users.map((entry) => ({ ...entry, roleIds: [] }))}
      />,
    )
    expect(screen.queryByText(/usuarios y roles mostrados son ficticios/)).not.toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.queryByText('luis@example.com')).not.toBeInTheDocument()
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).not.toBeChecked()
  })

  test('treats a whitespace-only search as an unfiltered list', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />)
    await user.type(screen.getByRole('searchbox'), '   ')
    for (const fixture of args.users) expect(screen.getByText(fixture.email)).toBeInTheDocument()
  })
  test('filters by partial name or email and preserves assigned roles', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />)
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios' })
    await user.type(search, '  ANA  ')
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.queryByText('luis@example.com')).not.toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Administrador: Ana Ejemplo (ana@example.com)' }),
    ).toBeChecked()
    await user.clear(search)
    await user.type(search, 'LUIS@')
    expect(screen.getByText('luis@example.com')).toBeInTheDocument()
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Asistente: Luis Ejemplo (luis@example.com)' }),
    ).toBeChecked()
  })

  test('shows no results and restores all users when the search is cleared', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />)
    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), 'inexistente')
    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron usuarios')
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    for (const fixture of args.users) expect(screen.getByText(fixture.email)).toBeInTheDocument()
  })
  test('explains when there are no users to display', () => {
    render(<UsersOverviewPage {...(Empty.args as UsersOverviewPageProps)} />)
    expect(screen.getByText('No hay usuarios para mostrar.')).toBeInTheDocument()
  })

  test('keeps users visible when no roles are available', () => {
    render(<UsersOverviewPage {...(NoRoles.args as UsersOverviewPageProps)} />)
    expect(screen.getByText('No hay roles disponibles para mostrar.')).toBeInTheDocument()
    expect(screen.getByText(args.users[0]!.email)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
