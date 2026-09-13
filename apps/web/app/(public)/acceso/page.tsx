import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/app/components/public/auth/LoginForm'
import { RegistrationForm } from '@/app/components/public/auth/RegistrationForm'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { listCountries } from '@/app/lib/auth/countries'
import {
  LOGIN_CARD_ID,
  REGISTRATION_CARD_ID,
  accesoBackLink,
  accesoIntro,
  accesoMeta,
  loginCardHeading,
  loginMessages,
  registrationCardHeading,
} from '@/app/lib/auth/login'
import { getSessionUser } from '@/app/lib/auth/session'
import { safeReturnPath } from '@/app/lib/auth/session-token'

import { loginUser, registerUser } from './actions'

export const metadata: Metadata = {
  title: accesoMeta.title,
  description: accesoMeta.description,
}

/**
 * Reads the query string and the session cookie, so it renders at request
 * time; `next build` never runs the session lookup (CI builds without a
 * database). Every other public page stays static.
 */
export const dynamic = 'force-dynamic'

interface AccesoPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * The access page from the mockup: the login card (LASCE-SEC-008-072) beside
 * the registration card (LASCE-SEC-008-071). `/login` and `/registro` redirect
 * here. `next` is where a successful login goes, validated to a path on this
 * site; `reason=auth` marks a visit forced by a protected page.
 */
export default async function AccesoPage({ searchParams }: AccesoPageProps) {
  const { next, reason } = await searchParams
  const returnTo = safeReturnPath(next)

  if (await getSessionUser()) {
    redirect(returnTo)
  }

  return (
    <article className="registration-page">
      <header className="page-intro page-width">
        <h1>{accesoIntro.title}</h1>
        <p>{accesoIntro.lead}</p>
      </header>

      <section className="registration-layout registration-layout-two page-width">
        <LoginForm
          action={loginUser}
          heading={loginCardHeading}
          id={LOGIN_CARD_ID}
          next={returnTo}
          notice={reason === 'auth' ? loginMessages.authRequired : undefined}
        />
        <RegistrationForm
          action={registerUser}
          countries={listCountries()}
          heading={registrationCardHeading}
          id={REGISTRATION_CARD_ID}
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={accesoBackLink.href} label={accesoBackLink.label} />
      </div>
    </article>
  )
}
