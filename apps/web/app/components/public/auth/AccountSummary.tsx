import { accountSummaryCopy } from '@/app/lib/auth/account'

import { SignOutButton } from './SignOutButton'

/** Display-ready profile: names and labels resolved, dates already formatted. */
export interface AccountProfile {
  fullName: string
  email: string
  institution: string
  countryName: string
  roleLabel: string
  memberSince: string
}

export interface AccountSummaryProps {
  profile: AccountProfile
  /** The logout Server Action; a plain form action, so it works without JavaScript. */
  logoutAction: () => Promise<void>
}

/**
 * The "Mi cuenta" card: the signed-in user's profile as a definition list and
 * the sign-out button, which asks for confirmation before submitting the
 * form. Presentational and server-safe: the page resolves the country name,
 * the role label and the date before rendering it.
 */
export function AccountSummary({ profile, logoutAction }: AccountSummaryProps) {
  const rows: Array<[string, string]> = [
    [accountSummaryCopy.fullName, profile.fullName],
    [accountSummaryCopy.email, profile.email],
    [accountSummaryCopy.institution, profile.institution],
    [accountSummaryCopy.country, profile.countryName],
    [accountSummaryCopy.role, profile.roleLabel],
    [accountSummaryCopy.memberSince, profile.memberSince],
  ]

  return (
    <section className="registration-card account-card">
      <dl className="account-details">
        {rows.map(([term, value]) => (
          <div className="account-detail" key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <form action={logoutAction} className="form-actions">
        <SignOutButton className="button button-secondary" submitsForm />
      </form>
    </section>
  )
}
