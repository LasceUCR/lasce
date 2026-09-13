import Link from 'next/link'

import { accountMenuCopy } from '@/app/lib/auth/account'

export interface AccountLinksProps {
  /** `header` renders the pill links of the desktop header; `mobile` plain menu links. */
  variant: 'header' | 'mobile'
  /** Display name of the signed-in account, or `null` when signed out. */
  account: string | null
  pathname: string
  isSigningOut: boolean
  onSignOut: () => void
  /** Called when a link is followed; the mobile menu closes itself with it. */
  onNavigate?: () => void
}

/**
 * The account corner of the header. Signed out it offers "Ingresar" and
 * "Crear cuenta"; signed in, a greeting that leads to the account page and a
 * sign-out button. Presentational: the state and the sign-out transition come
 * from `useAccount` in the header.
 */
export function AccountLinks({
  variant,
  account,
  pathname,
  isSigningOut,
  onSignOut,
  onNavigate,
}: AccountLinksProps) {
  const isHeader = variant === 'header'

  function linkProps(href: string, headerClass: string) {
    const isCurrent = pathname === href
    return {
      href,
      onClick: onNavigate,
      'aria-current': isCurrent ? ('page' as const) : undefined,
      className: isHeader ? headerClass : isCurrent ? 'active' : undefined,
    }
  }

  if (account === null) {
    return (
      <>
        <Link {...linkProps('/login', 'login-link')}>{accountMenuCopy.signIn}</Link>
        <Link {...linkProps('/registro', 'login-link register-link')}>
          {accountMenuCopy.register}
        </Link>
      </>
    )
  }

  return (
    <>
      <Link {...linkProps('/cuenta', 'login-link register-link account-link')} title={account}>
        {isHeader ? accountMenuCopy.greeting(account) : accountMenuCopy.account}
      </Link>
      <button
        className={isHeader ? 'login-link' : undefined}
        disabled={isSigningOut}
        onClick={onSignOut}
        type="button"
      >
        {isSigningOut ? accountMenuCopy.signingOut : accountMenuCopy.signOut}
      </button>
    </>
  )
}
