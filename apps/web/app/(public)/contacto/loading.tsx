import { getMessages, getTranslations } from 'next-intl/server'

import { ContactPageSkeleton } from '@/app/components/public/contact/ContactPageSkeleton'
import { getContactContent } from '@/app/lib/contact'

export default async function Loading() {
  const [messages, t] = await Promise.all([getMessages(), getTranslations('contact')])

  return <ContactPageSkeleton content={getContactContent(messages)} label={t('loading')} />
}
