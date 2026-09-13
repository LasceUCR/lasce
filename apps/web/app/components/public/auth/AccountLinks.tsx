import Link from 'next/link'

import { accountMenuCopy } from '@/app/lib/auth/account'
import { ACCESS_PATH, REGISTRATION_HREF } from '@/app/lib/auth/login'

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

  function linkProps(href: string, headerClass: string, isCurrent = pathname === href) {
    return {
      href,
      onClick: onNavigate,
      'aria-current': isCurrent ? ('page' as const) : undefined,
      className: isHeader ? headerClass : isCurrent ? 'active' : undefined,
    }
  }

  if (account === null) {
    // Both lead to the access page; only the sign-in link is marked current
    // there, since the registration link targets an anchor on the same page.
    return (
      <>
        <Link {...linkProps(ACCESS_PATH, 'login-link')}>{accountMenuCopy.signIn}</Link>
        <Link {...linkProps(REGISTRATION_HREF, 'login-link register-link', false)}>
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
