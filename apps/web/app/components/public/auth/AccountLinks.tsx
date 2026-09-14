import Link from 'next/link'

import { accountMenuCopy } from '@/app/lib/auth/account'
import { ACCESS_PATH } from '@/app/lib/auth/login'

import { SignOutButton } from './SignOutButton'

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
 * The account corner of the header. Signed out it offers "Ingresar"; signed
 * in, a greeting that leads to the account page and a sign-out button that
 * asks for confirmation first. Presentational: the state and the sign-out transition come
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
    // Registration is reached through the access page's own tab, so the
    // header offers sign-in only.
    return <Link {...linkProps(ACCESS_PATH, 'login-link')}>{accountMenuCopy.signIn}</Link>
  }

  return (
    <>
      <Link {...linkProps('/cuenta', 'login-link register-link account-link')} title={account}>
        {isHeader ? accountMenuCopy.greeting(account) : accountMenuCopy.account}
      </Link>
      <SignOutButton
        className={isHeader ? 'login-link' : undefined}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
      />
    </>
  )
}
