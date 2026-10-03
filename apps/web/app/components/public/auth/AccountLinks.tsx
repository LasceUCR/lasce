import Link from 'next/link'
import { LogIn, LogOut, User } from 'lucide-react'

import type { UserRole } from '@lasce/db'

import { isActivePath } from '@/app/components/public/NavGroup'
import { accountMenuCopy, canSeeAdminNavigation } from '@/app/lib/auth/account'
import { ACCESS_PATH } from '@/app/lib/auth/login'

import { AccountMenu } from './AccountMenu'
import { SignOutButton } from './SignOutButton'

export interface AccountLinksProps {
  /** `header` renders the compact desktop account menu; `mobile` plain menu links. */
  variant: 'header' | 'mobile'
  /** Display name of the signed-in account, or `null` when signed out. */
  account: string | null
  role: UserRole | null
  pathname: string
  isSigningOut: boolean
  onSignOut: () => void
  /** Called when a link is followed; the mobile menu closes itself with it. */
  onNavigate?: () => void
}

/**
 * The account corner of the header. Signed out it offers "Ingresar" with a
 * sign-in icon, on both the desktop pill and the mobile menu, matching the
 * icon+label pattern "Mi cuenta"/"Cerrar sesión" already use. Signed in, the
 * desktop header shows the compact account menu (`AccountMenu`,
 * matching the "Recursos"/"Nosotros" dropdowns); the mobile menu keeps plain
 * stacked links, since that account section is already a list, not a bar
 * that needs compacting. "Administración" lives only here, not as a
 * top-level nav entry, so it never appears twice. Presentational: the state
 * and the sign-out transition come from `useAccount` in the header.
 */
export function AccountLinks({
  variant,
  account,
  role,
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
    return (
      <Link {...linkProps(ACCESS_PATH, 'login-link')}>
        <span className="mobile-account-link-content">
          <LogIn aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>{accountMenuCopy.signIn}</span>
        </span>
      </Link>
    )
  }

  if (isHeader) {
    return (
      <AccountMenu
        account={account}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        pathname={pathname}
        role={role}
      />
    )
  }

  const isAdminActive = isActivePath(pathname, '/administracion')

  return (
    <>
      {canSeeAdminNavigation(role) ? (
        <Link
          aria-current={isAdminActive ? 'page' : undefined}
          className={isAdminActive ? 'active' : undefined}
          href="/administracion"
          onClick={onNavigate}
        >
          {accountMenuCopy.administracion}
        </Link>
      ) : null}
      <Link {...linkProps('/cuenta', '')}>
        <span className="mobile-account-link-content">
          <User aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>{accountMenuCopy.account}</span>
        </span>
      </Link>
      <SignOutButton
        icon={<LogOut aria-hidden="true" size={18} strokeWidth={1.8} />}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
      />
    </>
  )
}
