import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { accountMenuCopy, accountSummaryCopy } from '@/app/lib/auth/account'

import { AccountSummary, type AccountSummaryProps } from './AccountSummary'
import { Admin, Visitor } from './AccountSummary.stories'

const visitorArgs = Visitor.args as AccountSummaryProps
const adminArgs = Admin.args as AccountSummaryProps

describe('AccountSummary', () => {
  test('lists the six profile rows under their Spanish labels', () => {
    render(<AccountSummary {...visitorArgs} />)

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
    render(<AccountSummary {...adminArgs} />)

    expect(screen.getByText(adminArgs.profile.roleLabel)).toBeInTheDocument()
  })

  test('submits the sign-out form to the logout action', async () => {
    const user = userEvent.setup()
    const logoutAction = vi.fn().mockResolvedValue(undefined)
    render(<AccountSummary {...visitorArgs} logoutAction={logoutAction} />)

    await user.click(screen.getByRole('button', { name: accountMenuCopy.signOut }))

    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1))
  })
})
