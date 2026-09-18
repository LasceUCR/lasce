import type { Metadata } from 'next'

import { AccountSummary } from '@/app/components/public/auth/AccountSummary'
import { SpaceBackdrop } from '@/app/components/public/auth/SpaceBackdrop'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { ROLE_LABELS, cuentaBackLink, cuentaIntro, cuentaMeta } from '@/app/lib/auth/account'
import { countryName } from '@/app/lib/auth/countries'
import { requireUser } from '@/app/lib/auth/session'

import { logoutUser } from './actions'

export const metadata: Metadata = {
  title: cuentaMeta.title,
  description: cuentaMeta.description,
  // Personal to whoever is signed in: never a search result.
  robots: { index: false, follow: false },
}

/** Reads the session cookie, so it renders at request time and never at build. */
export const dynamic = 'force-dynamic'

const memberSince = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'long',
  timeZone: 'America/Costa_Rica',
})

/**
 * The first protected page (LASCE-SEC-008-072): a visitor without a live
 * session is sent to `/acceso` with the way back. Later tickets protect their
 * pages the same way, with `requireUser` (and, for roles, #73's helpers).
 */
export default async function CuentaPage() {
  const user = await requireUser('/cuenta')

  const profile = {
    fullName: user.fullName,
    email: user.email,
    institution: user.institution,
    countryName: countryName(user.countryCode),
    roleLabel: user.role ? ROLE_LABELS[user.role] : 'Sin rol asignado',
    memberSince: memberSince.format(user.createdAt),
  }

  return (
    <article className="registration-page space-page">
      <SpaceBackdrop />

      <header className="page-intro page-width">
        <h1>{cuentaIntro.title}</h1>
        <p>{cuentaIntro.lead}</p>
      </header>

      <section className="registration-layout page-width">
        <AccountSummary logoutAction={logoutUser} profile={profile} />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={cuentaBackLink.href} label={cuentaBackLink.label} />
      </div>
    </article>
  )
}
