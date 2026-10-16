import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { CollaborationsPage } from '@/app/components/public/collaborations/CollaborationsPage'
import { getCollaborationRecords } from '@/app/lib/collaboration-records'
import { getCollaborationsContent } from '@/app/lib/collaborations'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('collaborations.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/colaboraciones-e-iniciativas' },
  }
}

export const dynamic = 'force-dynamic'

export default async function CollaborationsRoute() {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()])
  const [canCreate, canEdit, canDelete] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])
  const collaborations = await getCollaborationRecords(resolveLocale(locale), {
    includeEditingData: canEdit,
  })

  return (
    <CollaborationsPage
      collaborations={collaborations}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      content={getCollaborationsContent(messages)}
    />
  )
}
