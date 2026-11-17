import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { AccountSummary, type AccountProfile } from '@/app/components/public/auth/AccountSummary'
import { SpaceBackdrop } from '@/app/components/public/auth/SpaceBackdrop'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { countryName } from '@/app/lib/auth/countries'
import { requireUser } from '@/app/lib/auth/session'
import { timeZone } from '@/app/lib/i18n/config'

import { logoutUser } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.meta')

  return {
    title: t('title'),
    description: t('description'),
    // Personal to whoever is signed in: never a search result.
    robots: { index: false, follow: false },
  }
}

/** Reads the session cookie, so it renders at request time and never at build. */
export const dynamic = 'force-dynamic'

/**
 * The first protected page (LASCE-SEC-008-072): a visitor without a live
 * session is sent to `/acceso` with the way back. Later tickets protect their
 * pages the same way, with `requireUser` (and, for roles, #73's helpers).
 */
export default async function CuentaPage() {
  const [user, locale, tAccount, tCommon] = await Promise.all([
    requireUser('/cuenta'),
    getLocale(),
    getTranslations('account'),
    getTranslations('common'),
  ])

  const memberSince = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone,
  })

  const profile: AccountProfile = {
    fullName: user.fullName,
    email: user.email,
    institution: user.institution,
    countryName: countryName(user.countryCode, locale),
    roleLabel: user.role ? tAccount(`roles.${user.role}`) : tAccount('noRole'),
    memberSince: memberSince.format(user.createdAt),
  }

  return (
    <article className="registration-page space-page">
      <SpaceBackdrop />

      <header className="page-intro page-width">
        <h1>{tAccount('page.title')}</h1>
        <p>{tAccount('page.lead')}</p>
      </header>

      <section className="registration-layout page-width">
        <AccountSummary logoutAction={logoutUser} profile={profile} />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={tCommon('backToHome')} />
      </div>
    </article>
  )
}
