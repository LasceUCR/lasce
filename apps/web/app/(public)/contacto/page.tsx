import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { ContactPage } from '@/app/components/public/contact/ContactPage'
import { getContactContent } from '@/app/lib/contact'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/contacto' },
  }
}

export default async function ContactRoute() {
  return <ContactPage content={getContactContent(await getMessages())} />
}
