import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { UsersRolesTable, type UsersRolesTableProps } from './UsersRolesTable'
import { Default } from './UsersRolesTable.stories'
import type { ReactElement } from 'react'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { renderWithIntl } from '@/app/lib/i18n/testing'

const args = Default.args as UsersRolesTableProps

/** The component as the page renders it: with the site's catalogue and the toast provider. */
function render(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(<ToastProvider>{ui}</ToastProvider>, { locale })
}

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
