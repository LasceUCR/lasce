import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { mockDialog } from '@/tests/unit/helpers/mock-dialog'
import { UserRolesRow, type UserRolesRowProps } from './UserRolesRow'
import { ReadOnly } from './UserRolesRow.stories'

mockDialog()
const args = ReadOnly.args as UserRolesRowProps

describe('UserRolesRow', () => {
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
