import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { UsersOverviewPage, type UsersOverviewPageProps } from './UsersOverviewPage'
import { Demo, Empty, NoRoles } from './UsersOverviewPage.stories'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

const args = Demo.args as UsersOverviewPageProps

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

describe('UsersOverviewPage', () => {
  test('reflects updated input data while keeping the current search', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<UsersOverviewPage {...args} />)
    await user.type(screen.getByRole('searchbox'), 'ana@')
    rerender(
      <ToastProvider>
        <UsersOverviewPage
          {...args}
          isDemo={false}
          users={args.users.map((entry) => ({ ...entry, roleIds: [] }))}
        />
      </ToastProvider>,
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
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('searchbox')).toHaveFocus()
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

describe('UsersOverviewPage in English', () => {
  test('shows the heading, help, table and search in English, with no raw keys', () => {
    render(<UsersOverviewPage {...args} onSaveRoles={async () => {}} />, 'en')

    expect(screen.getByRole('heading', { name: 'Users and roles' })).toBeVisible()
    expect(screen.getByText(/Each user can have a single role\./)).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Search users' })).toHaveAttribute(
      'placeholder',
      'Search by name or email address...',
    )
    expect(screen.getByRole('table', { name: 'Users and roles' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Email address' })).toBeVisible()
    expect(document.body.textContent).not.toMatch(/administration\.users/)
  })

  test('announces the result count with the plural rules of the language', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />, 'en')
    const search = screen.getByRole('searchbox', { name: 'Search users' })

    await user.type(search, 'ejemplo')
    expect(screen.getByRole('status')).toHaveTextContent(`${args.users.length} users found.`)
    await user.clear(search)
    await user.type(search, 'ana@')
    expect(screen.getByRole('status')).toHaveTextContent('1 user found.')
  })

  test('says in English when nothing matches, and offers to clear the search', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />, 'en')

    await user.type(screen.getByRole('searchbox'), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('No users found for “zzz”.')
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeVisible()
  })

  test('uses the Spanish plural for a single result', async () => {
    const user = userEvent.setup()
    render(<UsersOverviewPage {...args} />)

    await user.type(screen.getByRole('searchbox'), 'ana@')

    expect(screen.getByRole('status')).toHaveTextContent('1 usuario encontrado.')
  })

  test('explains an empty list in English', () => {
    render(<UsersOverviewPage {...args} users={[]} />, 'en')

    expect(screen.getByText('There are no users to show.')).toBeVisible()
  })
})
