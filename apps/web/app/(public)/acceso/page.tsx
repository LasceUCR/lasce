import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'

import { AccessTabs } from '@/app/components/public/auth/AccessTabs'
import { LoginForm } from '@/app/components/public/auth/LoginForm'
import { RegistrationForm } from '@/app/components/public/auth/RegistrationForm'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { listCountries } from '@/app/lib/auth/countries'
import {
  ACCESS_TAB_PARAM,
  LOGIN_CARD_ID,
  REGISTRATION_CARD_ID,
  accesoBackLink,
  accesoIntro,
  accesoMeta,
  accessTabFromParam,
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
 * The access page: the login card (LASCE-SEC-008-072) and the registration
 * card (LASCE-SEC-008-071) behind a tab selector, one visible at a time.
 * `/login` and `/registro` redirect here. `tab` picks the card, `next` is where
 * a successful login goes (validated to a path on this site) and `reason=auth`
 * marks a visit forced by a protected page.
 */
export default async function AccesoPage({ searchParams }: AccesoPageProps) {
  const params = await searchParams
  const returnTo = safeReturnPath(params.next)

  if (await getSessionUser()) {
    redirect(returnTo)
  }

  return (
    <article className="registration-page access-page">
      {/* Decorative full-bleed background; the gradient in CSS keeps the text
          on the left readable over the starfield. */}
      <div aria-hidden="true" className="access-page-bg">
        <Image alt="" fill priority sizes="100vw" src="/images/decorative/acceso-bg.jpg" />
      </div>

      <header className="page-intro page-width">
        <h1>{accesoIntro.title}</h1>
        <p>{accesoIntro.lead}</p>
      </header>

      <section className="registration-layout page-width">
        <AccessTabs
          initialTab={accessTabFromParam(params[ACCESS_TAB_PARAM])}
          login={
            <LoginForm
              action={loginUser}
              heading={loginCardHeading}
              id={LOGIN_CARD_ID}
              next={returnTo}
              notice={params.reason === 'auth' ? loginMessages.authRequired : undefined}
            />
          }
          register={
            <RegistrationForm
              action={registerUser}
              countries={listCountries()}
              heading={registrationCardHeading}
              id={REGISTRATION_CARD_ID}
            />
          }
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={accesoBackLink.href} label={accesoBackLink.label} />
      </div>
    </article>
  )
}
