'use client'

import Link from 'next/link'
import { ChevronDown, LogOut, User } from 'lucide-react'

import type { UserRole } from '@lasce/db'

import { isActivePath } from '@/app/components/public/NavGroup'
import { useDisclosure } from '@/app/components/public/useDisclosure'
import {
  ROLE_LABELS,
  accountMenuCopy,
  canSeeAdminNavigation,
  shortName,
} from '@/app/lib/auth/account'

import { SignOutButton } from './SignOutButton'

export interface AccountMenuProps {
  /** Display name of the signed-in account. */
  account: string
  role: UserRole | null
  pathname: string
  isSigningOut: boolean
  onSignOut: () => void
  /** Start open. Stories use it to show the panel. */
  defaultOpen?: boolean
}

/**
 * The signed-in desktop account menu: a trigger showing the same `User`
 * icon as "Mi cuenta" in the mobile menu, plus the account's short name,
 * opening the same disclosure the "Recursos" and "Nosotros" nav groups use
 * (`useDisclosure`, `.nav-group`, `.nav-group-panel`). The trigger and panel
 * deliberately reuse those same classes with no extra markup of their own,
 * so this is a plain nav-group visually and structurally, not a second
 * dropdown style: same box, same vertical origin, same caret. The panel
 * opens on an informational name/role block (not a link), then
 * "Administración" (only when the role can see it) and "Mi cuenta", then
 * "Cerrar sesión" with the same icon and neutral color the mobile menu gives
 * it (not red — this isn't a destructive-looking control, just the last
 * item), which keeps its own confirmation dialog via `SignOutButton`.
 */
export function AccountMenu({
  account,
  role,
  pathname,
  isSigningOut,
  onSignOut,
  defaultOpen = false,
}: AccountMenuProps) {
  const {
    detailsRef,
    summaryRef,
    open,
    close,
    handleSummaryClick,
    handleMouseLeave,
    handleKeyDown,
    handleBlur,
  } = useDisclosure()
  const showAdmin = canSeeAdminNavigation(role)
  const roleLabel = role ? ROLE_LABELS[role] : null

  return (
    <details
      className="nav-group account-menu"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={open}
      onMouseLeave={handleMouseLeave}
      open={defaultOpen ? true : undefined}
      ref={detailsRef}
    >
      <summary onClick={handleSummaryClick} ref={summaryRef}>
        <User aria-hidden="true" size={18} strokeWidth={1.8} />
        {shortName(account)}
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.6} />
      </summary>
      <div className="nav-group-panel account-menu-panel">
        <div className="account-menu-info">
          <p className="account-menu-name">{account}</p>
          {roleLabel ? <p className="account-menu-role">{roleLabel}</p> : null}
        </div>
        <hr aria-hidden="true" className="account-menu-divider" />
        {showAdmin ? (
          <Link
            aria-current={isActivePath(pathname, '/administracion') ? 'page' : undefined}
            className={isActivePath(pathname, '/administracion') ? 'active' : undefined}
            href="/administracion"
            onClick={close}
          >
            {accountMenuCopy.administracion}
          </Link>
        ) : null}
        <Link
          aria-current={isActivePath(pathname, '/cuenta') ? 'page' : undefined}
          className={isActivePath(pathname, '/cuenta') ? 'active' : undefined}
          href="/cuenta"
          onClick={close}
        >
          {accountMenuCopy.account}
        </Link>
        <hr aria-hidden="true" className="account-menu-divider" />
        <SignOutButton
          className="account-menu-signout"
          icon={<LogOut aria-hidden="true" size={18} strokeWidth={1.8} />}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
        />
      </div>
    </details>
  )
}
