'use client'

import Link from 'next/link'
import { ChevronDown, Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations, type Messages } from 'next-intl'
import { useEffect, useRef, useState, useTransition } from 'react'

import { localeLabels, locales, type Locale } from '@/app/lib/i18n/config'

import { Brand } from './Brand'
import { LanguageMenu } from './LanguageMenu'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NavGroup, isActivePath } from './NavGroup'
import { AccountLinks } from './auth/AccountLinks'
import { useAccount } from './auth/useAccount'

// An entry is identified by its key in the `nav` message namespace, which is also where its
// label comes from. The id is the same in every language; the label is not.
type NavId = keyof Messages['nav']

interface NavLinkEntry {
  id: NavId
  href: string
}

interface NavGroupEntry {
  id: NavId
  items: NavLinkEntry[]
}

type NavEntry = NavLinkEntry | NavGroupEntry

// The desktop header shows a group as a disclosure; the mobile menu keeps the same
// grouping, under a plain label the group's own items nest below.
const navigation: NavEntry[] = [
  { id: 'home', href: '/' },
  {
    id: 'about',
    items: [
      { id: 'whoWeAre', href: '/nosotros' },
      { id: 'collaborations', href: '/colaboraciones-e-iniciativas' },
    ],
  },
  {
    id: 'research',
    items: [
      { id: 'researchAreas', href: '/investigacion' },
      { id: 'solarPhysics', href: '/fisica-solar' },
      { id: 'spaceWeather', href: '/clima-espacial' },
      { id: 'rosac', href: '/radioastronomia' },
    ],
  },
  { id: 'data', href: '/datos' },
  {
    id: 'outreach',
    items: [
      { id: 'news', href: '/noticias' },
      { id: 'gallery', href: '/galeria' },
    ],
  },
  {
    id: 'resources',
    items: [
      { id: 'publications', href: '/publicaciones' },
      { id: 'scientificTools', href: '/herramientas-cientificas' },
    ],
  },
  { id: 'contact', href: '/contacto' },
]

const languageOptions = locales.map((locale) => ({
  value: locale,
  label: localeLabels[locale],
  shortLabel: locale.toUpperCase(),
}))

function isGroup(entry: NavEntry): entry is NavGroupEntry {
  return 'items' in entry
}

export interface PublicHeaderProps {
  /** The logout Server Action, passed down by the layout so the header stays presentational. */
  logoutAction: () => Promise<void>
  /** The Server Action that stores the chosen language, passed down the same way. */
  setLocaleAction: (locale: Locale) => Promise<void>
}

export function PublicHeader({ logoutAction, setLocaleAction }: PublicHeaderProps) {
  const t = useTranslations('nav')
  const languageLabel = useTranslations('languageSwitcher')('label')
  const locale = useLocale()
  const [isChangingLocale, startLocaleChange] = useTransition()
  const pathname = usePathname()
  const { account, role, isSigningOut, signOut } = useAccount(logoutAction)
  const mobileMenu = useRef<HTMLDetailsElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    function updateHeaderState() {
      setIsScrolled(window.scrollY > 24)
    }

    updateHeaderState()
    window.addEventListener('scroll', updateHeaderState, { passive: true })

    return () => window.removeEventListener('scroll', updateHeaderState)
  }, [])

  function changeLocale(next: Locale) {
    startLocaleChange(async () => {
      await setLocaleAction(next)
    })
  }

  function closeMobileMenu() {
    mobileMenu.current?.removeAttribute('open')
    setIsMobileMenuOpen(false)
  }

  function updateMobileMenuState() {
    setIsMobileMenuOpen(Boolean(mobileMenu.current?.open))
  }

  // Which mobile "Recursos"-style groups are expanded, keyed by id. Starts
  // with whichever ones contain the current page, and updates on navigation
  // without collapsing one the visitor opened by hand. A group's own `open`
  // is fully controlled from here rather than left to the native default, so
  // a click deterministically expands or collapses it (see NavGroup.tsx for
  // why relying on the native toggle alone is fragile).
  const [openGroupIds, setOpenGroupIds] = useState<Set<NavId>>(
    () =>
      new Set(
        navigation
          .filter(
            (entry): entry is NavGroupEntry =>
              isGroup(entry) && entry.items.some((item) => isActivePath(pathname, item.href)),
          )
          .map((entry) => entry.id),
      ),
  )

  useEffect(() => {
    setOpenGroupIds((current) => {
      let changed = false
      const next = new Set(current)

      for (const entry of navigation) {
        if (
          isGroup(entry) &&
          entry.items.some((item) => isActivePath(pathname, item.href)) &&
          !next.has(entry.id)
        ) {
          next.add(entry.id)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [pathname])

  function toggleGroup(id: NavId) {
    setOpenGroupIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    function closeMenuOnOutsidePointer(event: Event) {
      // Read the native disclosure directly; its toggle notification is asynchronous.
      if (!mobileMenu.current?.open) return
      if (mobileMenu.current?.contains(event.target as Node)) {
        return
      }

      closeMobileMenu()
    }

    document.addEventListener('pointerdown', closeMenuOnOutsidePointer, true)
    document.addEventListener('touchstart', closeMenuOnOutsidePointer, {
      capture: true,
      passive: true,
    })

    return () => {
      document.removeEventListener('pointerdown', closeMenuOnOutsidePointer, true)
      document.removeEventListener('touchstart', closeMenuOnOutsidePointer, true)
    }
  }, [])

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <Link className="brand-link" href="/" aria-label={t('goHome')}>
        <Brand />
      </Link>

      <nav className="desktop-nav" aria-label={t('mainLabel')}>
        {navigation.map((entry) => {
          if (isGroup(entry)) {
            return (
              <NavGroup
                items={entry.items.map((item) => ({ label: t(item.id), href: item.href }))}
                key={entry.id}
                label={t(entry.id)}
                pathname={pathname}
              />
            )
          }

          const isActive = isActivePath(pathname, entry.href)

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'active' : undefined}
              href={entry.href}
              key={entry.id}
            >
              {t(entry.id)}
            </Link>
          )
        })}
      </nav>

      <div className="header-actions">
        <LanguageMenu
          disabled={isChangingLocale}
          label={languageLabel}
          locale={locale}
          onChange={changeLocale}
          options={languageOptions}
        />
        <AccountLinks
          account={account}
          isSigningOut={isSigningOut}
          onSignOut={signOut}
          pathname={pathname}
          role={role}
          variant="header"
        />
      </div>

      {isMobileMenuOpen ? (
        <button
          aria-label={t('closeMenu')}
          className="mobile-menu-backdrop"
          onClick={closeMobileMenu}
          type="button"
        />
      ) : null}

      <details className="mobile-menu" onToggle={updateMobileMenuState} ref={mobileMenu}>
        <summary aria-label={t('openMenu')}>
          <Menu aria-hidden="true" size={25} strokeWidth={1.8} />
        </summary>
        <nav aria-label={t('mobileLabel')}>
          {navigation.map((entry) => {
            if (isGroup(entry)) {
              return (
                <details
                  className="mobile-nav-group"
                  key={entry.id}
                  open={openGroupIds.has(entry.id)}
                >
                  <summary
                    className="mobile-nav-group-summary"
                    onClick={(event) => {
                      event.preventDefault()
                      toggleGroup(entry.id)
                    }}
                  >
                    {t(entry.id)}
                    <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} />
                  </summary>
                  <div className="mobile-nav-group-panel">
                    {entry.items.map((item) => {
                      const isActive = isActivePath(pathname, item.href)

                      return (
                        <Link
                          aria-current={isActive ? 'page' : undefined}
                          className={
                            isActive ? 'mobile-nav-group-item active' : 'mobile-nav-group-item'
                          }
                          href={item.href}
                          key={item.id}
                          onClick={closeMobileMenu}
                        >
                          {t(item.id)}
                        </Link>
                      )
                    })}
                  </div>
                </details>
              )
            }

            const isActive = isActivePath(pathname, entry.href)

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                href={entry.href}
                key={entry.id}
                onClick={closeMobileMenu}
              >
                {t(entry.id)}
              </Link>
            )
          })}
          <div className="mobile-language-section">
            <LanguageSwitcher
              disabled={isChangingLocale}
              label={languageLabel}
              locale={locale}
              onChange={changeLocale}
              options={languageOptions}
            />
          </div>
          <div className="mobile-account-section">
            <AccountLinks
              account={account}
              isSigningOut={isSigningOut}
              onNavigate={closeMobileMenu}
              onSignOut={signOut}
              pathname={pathname}
              role={role}
              variant="mobile"
            />
          </div>
        </nav>
      </details>
    </header>
  )
}
