import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { UserRoleAssignment } from './UserRoleAssignment'
import meta from './UserRoleAssignment.stories'
import type { UserRoleAssignmentProps } from './UserRoleAssignment'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'

mockDialog()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

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
      expect(screen.getByRole('alert')).toBeVisible()
      expect(
        screen.getByRole('checkbox', { name: 'Administrador: Ana Ejemplo (ana@example.com)' }),
      ).toBeChecked()
    }
  })
})
