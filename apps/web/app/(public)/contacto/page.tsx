import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { ContactPage } from '@/app/components/public/contact/ContactPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getContactContent } from '@/app/lib/contact'
import { getContactChannels } from '@/app/lib/contact-channels'
import { resolveLocale } from '@/app/lib/i18n/locale'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/contacto' },
  }
}

export default async function ContactRoute() {
  const [messages, locale, canCreate, canEdit, canDelete] = await Promise.all([
    getMessages(),
    getLocale(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  const cards = await getContactChannels(resolveLocale(locale), canEdit)

  return (
    <ContactPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      cards={cards}
      content={getContactContent(messages)}
    />
  )
}
