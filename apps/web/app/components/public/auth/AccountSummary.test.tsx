import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { accountSummaryCopy } from '@/app/lib/auth/account'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { AccountSummary, type AccountSummaryProps } from './AccountSummary'
import { Admin, Visitor } from './AccountSummary.stories'

const visitorArgs = Visitor.args as AccountSummaryProps
const adminArgs = Admin.args as AccountSummaryProps

describe('AccountSummary', () => {
  test('lists the six profile rows under their Spanish labels', () => {
    renderWithIntl(<AccountSummary {...visitorArgs} />)

    const terms = screen.getAllByRole('term').map((term) => term.textContent)
    const definitions = screen.getAllByRole('definition').map((item) => item.textContent)

    expect(terms).toEqual([
      accountSummaryCopy.fullName,
      accountSummaryCopy.email,
      accountSummaryCopy.institution,
      accountSummaryCopy.country,
      accountSummaryCopy.role,
      accountSummaryCopy.memberSince,
    ])
    expect(definitions).toEqual([
      visitorArgs.profile.fullName,
      visitorArgs.profile.email,
      visitorArgs.profile.institution,
      visitorArgs.profile.countryName,
      visitorArgs.profile.roleLabel,
      visitorArgs.profile.memberSince,
    ])
  })

  test('shows the role label it was given', () => {
    renderWithIntl(<AccountSummary {...adminArgs} />)

    expect(screen.getByText(adminArgs.profile.roleLabel)).toBeInTheDocument()
  })

  test('submits the sign-out form to the logout action once confirmed', async () => {
    const user = userEvent.setup()
    const logoutAction = vi.fn().mockResolvedValue(undefined)
    renderWithIntl(<AccountSummary {...visitorArgs} logoutAction={logoutAction} />)

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(logoutAction).not.toHaveBeenCalled()
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar sesión' }),
    )

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
  })
})
