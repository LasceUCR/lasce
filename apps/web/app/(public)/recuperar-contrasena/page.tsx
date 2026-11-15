import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PasswordRecoveryForm } from '@/app/components/public/auth/PasswordRecoveryForm'
import { SpaceBackdrop } from '@/app/components/public/auth/SpaceBackdrop'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { LOGIN_HREF } from '@/app/lib/auth/login'

import { requestPasswordReset } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.passwordReset.request.meta')

  return { title: t('title'), description: t('description'), robots: { index: false } }
}

/**
 * Where "¿Olvidaste tu contraseña?" on the login card leads (LASCE-CON-0012-448): one email field
 * and the same confirmation for every valid address. See `docs/password-reset.md`.
 */
export default async function RecuperarContrasenaPage() {
  const t = await getTranslations('auth.passwordReset')

  return (
    <article className="registration-page space-page">
      <SpaceBackdrop />

      <header className="page-intro page-width">
        <h1>{t('request.title')}</h1>
        <p>{t('request.lead')}</p>
      </header>

      <section className="registration-layout page-width">
        <PasswordRecoveryForm action={requestPasswordReset} loginHref={LOGIN_HREF} />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={LOGIN_HREF} label={t('backLink')} />
      </div>
    </article>
  )
}
