'use client'

import { useTranslations } from 'next-intl'

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
 * form. Presentational: reads its row labels from the `account.profile`
 * catalogue namespace so they follow the site language.
 */
export function AccountSummary({ profile, logoutAction }: AccountSummaryProps) {
  const t = useTranslations('account.profile')

  const rows: Array<[string, string]> = [
    [t('fullName'), profile.fullName],
    [t('email'), profile.email],
    [t('institution'), profile.institution],
    [t('country'), profile.countryName],
    [t('role'), profile.roleLabel],
    [t('memberSince'), profile.memberSince],
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
