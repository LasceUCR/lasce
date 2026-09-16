import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { UsersRolesTable, type UsersRolesTableProps } from './UsersRolesTable'
import { Default } from './UsersRolesTable.stories'

const args = Default.args as UsersRolesTableProps

describe('UsersRolesTable', () => {
  test('shows users and their current assignments as non-editable indicators', () => {
    render(<UsersRolesTable {...args} />)
    for (const user of args.users) {
      const row = screen.getByRole('row', { name: new RegExp(user.email) })
      for (const role of args.roles) {
        const indicator = within(row).getByRole('checkbox', {
          name: `${role.name}: ${user.name} (${user.email})`,
        })
        expect(indicator).toBeDisabled()
        if (user.roleIds.includes(role.id)) expect(indicator).toBeChecked()
        else expect(indicator).not.toBeChecked()
      }
    }
  })

  test('uses the supplied role identifiers and names instead of a fixed role list', () => {
    render(
      <UsersRolesTable
        {...args}
        roles={[{ id: 'custom-role', name: 'Observación' }]}
        users={[{ ...args.users[0]!, roleIds: ['custom-role'] }]}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Observación' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Administrador' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
