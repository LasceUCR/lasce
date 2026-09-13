import type { Metadata } from 'next'

import { RegistrationForm } from '@/app/components/public/auth/RegistrationForm'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { listCountries } from '@/app/lib/auth/countries'
import { registroBackLink, registroIntro, registroMeta } from '@/app/lib/auth/registration'

import { registerUser } from './actions'

export const metadata: Metadata = {
  title: registroMeta.title,
  description: registroMeta.description,
}

/**
 * Account registration (LASCE-SEC-008-071). The page itself is static: the
 * country list is computed on the server at build time and the only dynamic
 * work happens inside the `registerUser` Server Action.
 *
 * The layout follows the access-page mockup, which places this card beside a
 * login card. That card is LASCE-SEC-008-072; `registration-layout` is already
 * a grid so it can be dropped in without restyling.
 */
export default function RegistroPage() {
  return (
    <article className="registration-page">
      <header className="page-intro page-width">
        <h1>{registroIntro.title}</h1>
        <p>{registroIntro.lead}</p>
      </header>

      <section className="registration-layout page-width">
        <RegistrationForm action={registerUser} countries={listCountries()} />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href={registroBackLink.href} label={registroBackLink.label} />
      </div>
    </article>
  )
}
