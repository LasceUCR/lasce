import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PasswordResetForm } from '@/app/components/public/auth/PasswordResetForm'
import { SpaceBackdrop } from '@/app/components/public/auth/SpaceBackdrop'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { LOGIN_HREF } from '@/app/lib/auth/login'
import { RESET_TOKEN_PARAM, invalidTokenState } from '@/app/lib/auth/password-reset'
import { isPasswordResetTokenUsable } from '@/app/lib/auth/password-reset-store'

import { resetPassword } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.passwordReset.reset.meta')

  // The URL carries a working token: keep it out of search engines and of the Referer of any
  // request the page makes (`next.config.ts` also sends the header).
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

/** Reads the token and checks it in the database, so it renders per request. */
export const dynamic = 'force-dynamic'

interface RestablecerContrasenaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Where the emailed link leads (LASCE-CON-0012-448). A token that is unknown, used or expired
 * shows the "request a new link" panel at once rather than a form that would fail on submit.
 * Checking it here does not use it up; only a successful submission does.
 */
export default async function RestablecerContrasenaPage({
  searchParams,
}: RestablecerContrasenaPageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations('auth.passwordReset')])
  const raw = params[RESET_TOKEN_PARAM]
  const token = typeof raw === 'string' ? raw : ''
  const usable = await isPasswordResetTokenUsable(token)

  return (
    <article className="registration-page space-page">
      <SpaceBackdrop />

      <header className="page-intro page-width">
        <h1>{t('reset.title')}</h1>
        {usable ? <p>{t('reset.lead')}</p> : null}
      </header>

      <section className="registration-layout page-width">
        <PasswordResetForm
          action={resetPassword}
          initialState={usable ? undefined : invalidTokenState}
          token={usable ? token : ''}
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={LOGIN_HREF} label={t('backLink')} />
      </div>
    </article>
  )
}
