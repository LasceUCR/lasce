import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { AccessTabs } from '@/app/components/public/auth/AccessTabs'
import { LoginForm } from '@/app/components/public/auth/LoginForm'
import { RegistrationForm } from '@/app/components/public/auth/RegistrationForm'
import { SpaceBackdrop } from '@/app/components/public/auth/SpaceBackdrop'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { listCountries } from '@/app/lib/auth/countries'
import {
  ACCESS_TAB_PARAM,
  LOGIN_CARD_ID,
  NEXT_FIELD,
  accessTabHref,
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
import {
  DEFAULT_RETURN_PATH,
  returnPathFromReferer,
  safeReturnPath,
} from '@/app/lib/auth/session-token'

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
 * `/login` and `/registro` redirect here. `tab` picks the card and
 * `reason=auth` marks a visit forced by a protected page.
 *
 * A successful login returns the visitor to where they were: the `next`
 * parameter when a protected page set it, otherwise the same-site page they
 * came from (the Referer of the navigation), otherwise the home page. Every
 * value is validated to a path on this site.
 */
export default async function AccesoPage({ searchParams }: AccesoPageProps) {
  const params = await searchParams
  const requestHeaders = await headers()
  const returnTo =
    params[NEXT_FIELD] !== undefined
      ? safeReturnPath(params[NEXT_FIELD])
      : (returnPathFromReferer(
          requestHeaders.get('referer'),
          requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
        ) ?? DEFAULT_RETURN_PATH)

  if (await getSessionUser()) {
    redirect(returnTo)
  }

  return (
    <article className="registration-page space-page">
      <SpaceBackdrop />

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
              registerHref={accessTabHref(
                'register',
                returnTo === DEFAULT_RETURN_PATH ? undefined : returnTo,
              )}
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
