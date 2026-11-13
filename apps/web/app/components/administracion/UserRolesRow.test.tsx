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
    for (const checkbox of within(container).getAllByRole('checkbox')) {
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
    const visitor = screen.getByRole('checkbox', { name: /^Visitante:/ })
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
    await user.click(screen.getByRole('checkbox', { name }))
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
    const owned = args.roles.find((role) => args.user.roleIds.includes(role.id))!
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} onSaveRoles={vi.fn(async () => {})} />
        </tbody>
      </table>,
      'en',
    )

    await user.click(screen.getByRole('checkbox', { name: new RegExp(`^${owned.name}:`) }))
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

  test('labels each role checkbox in English', () => {
    render(
      <table>
        <tbody>
          <UserRolesRow {...args} />
        </tbody>
      </table>,
      'en',
    )

    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(
      `${args.roles[0]!.name}: ${args.user.name} (${args.user.email})`,
    )
  })
})
