import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { CollaborationsPage } from '@/app/components/public/collaborations/CollaborationsPage'
import { getCollaborationsContent } from '@/app/lib/collaborations'
import { getResearchCollaborations } from '@/app/lib/research-collaborations'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('collaborations.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/colaboraciones-e-iniciativas' },
  }
}

export default async function CollaborationsRoute() {
  const messages = await getMessages()

  return (
    <CollaborationsPage
      collaborations={getResearchCollaborations(messages.collaborations.countries)}
      content={getCollaborationsContent(messages)}
    />
  )
}
