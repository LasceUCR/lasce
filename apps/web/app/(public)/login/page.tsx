import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/app/components/public/auth/LoginForm'
import { RegistrationForm } from '@/app/components/public/auth/RegistrationForm'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { listCountries } from '@/app/lib/auth/countries'
import {
  loginBackLink,
  loginIntro,
  loginMessages,
  loginMeta,
  loginRegistrationHeading,
} from '@/app/lib/auth/login'
import { getSessionUser } from '@/app/lib/auth/session'
import { safeReturnPath } from '@/app/lib/auth/session-token'

import { registerUser } from '../registro/actions'
import { loginUser } from './actions'

export const metadata: Metadata = {
  title: loginMeta.title,
  description: loginMeta.description,
}

/**
 * Reads the query string and the session cookie, so it renders at request
 * time; `next build` never runs the session lookup (CI builds without a
 * database). Every other public page stays static.
 */
export const dynamic = 'force-dynamic'

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * The access page from the mockup (LASCE-SEC-008-072): the login card beside
 * the registration card. `next` is where a successful login goes, validated to
 * a path on this site; `reason=auth` marks a visit forced by a protected page.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, reason } = await searchParams
  const returnTo = safeReturnPath(next)

  if (await getSessionUser()) {
    redirect(returnTo)
  }

  return (
    <article className="registration-page">
      <header className="page-intro page-width">
        <h1>{loginIntro.title}</h1>
        <p>{loginIntro.lead}</p>
      </header>

      <section className="registration-layout registration-layout-two page-width">
        <LoginForm
          action={loginUser}
          next={returnTo}
          notice={reason === 'auth' ? loginMessages.authRequired : undefined}
        />
        <RegistrationForm
          action={registerUser}
          countries={listCountries()}
          heading={loginRegistrationHeading}
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={loginBackLink.href} label={loginBackLink.label} />
      </div>
    </article>
  )
}
