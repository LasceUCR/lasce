import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { renderToString } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRolesRow, type UserRolesRowProps } from './UserRolesRow'
import { ReadOnly } from './UserRolesRow.stories'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { timeZone } from '@/app/lib/i18n/config'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

mockDialog()
const args = ReadOnly.args as UserRolesRowProps

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

describe('UserRolesRow', () => {
  test('keeps server-rendered controls disabled until confirmation handlers are ready', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(
      <NextIntlClientProvider locale="es" messages={getMessages('es')} timeZone={timeZone}>
        <ToastProvider>
          <table>
            <tbody>
              <UserRolesRow {...args} onUserSelect={vi.fn()} onSaveRoles={vi.fn(async () => {})} />
            </tbody>
          </table>
        </ToastProvider>
      </NextIntlClientProvider>,
    )
    expect(within(container).getByRole('button', { name: args.user.name })).toBeDisabled()
    for (const checkbox of within(container).getAllByRole('radio')) {
      expect(checkbox).toBeDisabled()
    }
  })

  test('requires confirmation before replacing a role and cancels without a save', async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => {})
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} onSaveRoles={save} />
        </tbody>
      </table>,
    )
    const visitor = screen.getByRole('radio', { name: /^Visitante:/ })
    await user.click(visitor)
    expect(visitor).not.toBeChecked()
    expect(save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'No, cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(visitor).toHaveFocus()
    expect(save).not.toHaveBeenCalled()
    await user.click(visitor)
    await user.click(screen.getByRole('button', { name: 'Sí, cambiar rol' }))
    expect(save).toHaveBeenCalledExactlyOnceWith(args.user.id, [args.roles[0]!.id])
  })
})

describe('UserRolesRow single-choice control', () => {
  function renderRow(props: Partial<UserRolesRowProps> = {}) {
    return render(
      <>
        <p id="no-role-help">Explicación de Sin rol</p>
        <table>
          <tbody>
            <UserRolesRow {...args} noRoleDescribedBy="no-role-help" {...props} />
          </tbody>
        </table>
      </>,
    )
  }

  test('offers every role and "Sin rol" as one group with exactly one option selected', () => {
    renderRow({ onSaveRoles: vi.fn(async () => {}) })
    const options = screen.getAllByRole('radio')
    expect(options.map((option) => option.getAttribute('aria-label'))).toEqual([
      ...args.roles.map((role) => `${role.name}: ${args.user.name} (${args.user.email})`),
      `Sin rol: ${args.user.name} (${args.user.email})`,
    ])
    expect(new Set(options.map((option) => option.getAttribute('name'))).size).toBe(1)
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
    expect(screen.getByRole('radio', { name: /^Administrador:/ })).toBeChecked()
  })

  test('selects "Sin rol" for an account without a role and explains what that means', () => {
    renderRow({ user: { ...args.user, roleIds: [] } })
    const noRole = screen.getByRole('radio', { name: /^Sin rol:/ })
    expect(noRole).toBeChecked()
    expect(noRole).toHaveAccessibleDescription('Explicación de Sin rol')
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
  })

  test('asks for confirmation before leaving an account without a role', async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => {})
    renderRow({ onSaveRoles: save })
    await user.click(screen.getByRole('radio', { name: /^Sin rol:/ }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar retiro de rol' })
    expect(within(dialog).getByText(/no tendrá ningún permiso/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Administrador:/ })).toBeChecked()
    expect(save).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Sí, retirar rol' }))
    expect(save).toHaveBeenCalledExactlyOnceWith(args.user.id, [])
  })

  test('moves between options with the arrow keys and keeps the role when cancelled', async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => {})
    renderRow({ onSaveRoles: save })
    const admin = screen.getByRole('radio', { name: /^Administrador:/ })
    admin.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: 'Confirmar retiro de rol' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'No, cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus returns to the option the arrow key reached; the saved role stays selected.
    expect(screen.getByRole('radio', { name: /^Sin rol:/ })).toHaveFocus()
    expect(admin).toBeChecked()
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
    expect(save).not.toHaveBeenCalled()
  })
})

describe('UserRolesRow outcomes', () => {
  async function replaceRole(locale: Locale, save: UserRolesRowProps['onSaveRoles']) {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} onSaveRoles={save} />
        </tbody>
      </table>,
      locale,
    )
    const name = locale === 'en' ? /^Visitante:/ : /^Visitante:/
    await user.click(screen.getByRole('radio', { name }))
    await user.click(
      screen.getByRole('button', {
        name: locale === 'en' ? 'Yes, change role' : 'Sí, cambiar rol',
      }),
    )
    return user
  }

  test('reports a saved change with a toast, in Spanish', async () => {
    await replaceRole(
      'es',
      vi.fn(async () => {}),
    )

    expect(
      await screen.findByText(`Rol actualizado para ${args.user.name}: ${args.roles[0]!.name}.`),
    ).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('reports a saved change with a toast, in English', async () => {
    await replaceRole(
      'en',
      vi.fn(async () => {}),
    )

    expect(
      await screen.findByText(`Role updated for ${args.user.name}: ${args.roles[0]!.name}.`),
    ).toBeVisible()
  })

  test('reports a removed role in English', async () => {
    const user = userEvent.setup()
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} onSaveRoles={vi.fn(async () => {})} />
        </tbody>
      </table>,
      'en',
    )

    await user.click(screen.getByRole('radio', { name: /^No role:/ }))
    await user.click(screen.getByRole('button', { name: 'Yes, remove role' }))

    expect(await screen.findByText(`Role removed from ${args.user.name}.`)).toBeVisible()
  })

  test('shows a failure as a toast and keeps the dialog open', async () => {
    await replaceRole(
      'en',
      vi.fn(async () => {
        throw new Error('raw server message')
      }),
    )

    expect(await screen.findByText(/We could not confirm the change/)).toBeVisible()
    expect(screen.queryByText('raw server message')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  test('labels each role option in English', () => {
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} />
        </tbody>
      </table>,
      'en',
    )

    expect(screen.getAllByRole('radio')[0]).toHaveAccessibleName(
      `${args.roles[0]!.name}: ${args.user.name} (${args.user.email})`,
    )
  })
})
