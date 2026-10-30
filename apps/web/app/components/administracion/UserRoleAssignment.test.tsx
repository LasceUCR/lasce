import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { UserRoleAssignment } from './UserRoleAssignment'
import meta from './UserRoleAssignment.stories'
import type { UserRoleAssignmentProps } from './UserRoleAssignment'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

mockDialog()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

describe('persisted role assignments', () => {
  test.each([true, false])('updates the row only after a successful save (%s)', async (ok) => {
    const saveAction = vi.fn(async () =>
      ok ? { ok: true as const, roleIds: ['demo-visitor'] } : { ok: false as const },
    )
    const user = userEvent.setup()
    render(
      <UserRoleAssignment {...(meta.args as UserRoleAssignmentProps)} saveAction={saveAction} />,
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Visitante: Ana Ejemplo (ana@example.com)' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, cambiar rol' }),
    )
    expect(saveAction).toHaveBeenCalledWith({
      userId: 'demo-1',
      roleIds: ['demo-visitor'],
      previousRoleIds: ['demo-admin'],
    })
    if (ok)
      expect(
        screen.getByRole('checkbox', { name: 'Visitante: Ana Ejemplo (ana@example.com)' }),
      ).toBeChecked()
    else {
      // A failure is reported as a toast, in the site's language, and the dialog stays open.
      expect(await screen.findByText(/No pudimos confirmar el cambio/)).toBeVisible()
      expect(screen.getByRole('dialog')).toBeVisible()
      expect(
        screen.getByRole('checkbox', { name: 'Administrador: Ana Ejemplo (ana@example.com)' }),
      ).toBeChecked()
    }
  })
})

describe('translated failures', () => {
  test.each([
    ['conflict', 'es', /La información de este usuario cambió/],
    ['conflict', 'en', /This user's information changed/],
    ['unauthorized', 'es', /Tu sesión terminó/],
    ['unauthorized', 'en', /Your session ended/],
  ] as const)('shows the %s failure in %s', async (reason, locale, message) => {
    const saveAction = vi.fn(async () => ({ ok: false as const, reason }))
    const user = userEvent.setup()
    render(
      <UserRoleAssignment {...(meta.args as UserRoleAssignmentProps)} saveAction={saveAction} />,
      locale,
    )

    await user.click(
      screen.getByRole('checkbox', { name: 'Visitante: Ana Ejemplo (ana@example.com)' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: locale === 'en' ? 'Yes, change role' : 'Sí, cambiar rol',
      }),
    )

    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: 'Administrador: Ana Ejemplo (ana@example.com)' }),
    ).toBeChecked()
  })
})
