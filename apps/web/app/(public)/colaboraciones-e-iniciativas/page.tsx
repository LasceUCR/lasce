import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { CollaborationsPage } from '@/app/components/public/collaborations/CollaborationsPage'
import { getCollaborationRecords } from '@/app/lib/collaboration-records'
import { getCollaborationsContent } from '@/app/lib/collaborations'
import { resolveLocale } from '@/app/lib/i18n/locale'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('collaborations.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/colaboraciones-e-iniciativas' },
  }
}

export default async function CollaborationsRoute() {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()])
  const collaborations = await getCollaborationRecords(resolveLocale(locale))

  return (
    <CollaborationsPage
      collaborations={collaborations}
      content={getCollaborationsContent(messages)}
    />
  )
}
