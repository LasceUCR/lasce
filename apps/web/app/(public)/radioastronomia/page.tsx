import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getResearchers, getRosacInfoContent, type RosacMessages } from '@/app/lib/rosac'
import { workAreaPath } from '@/app/lib/work-areas'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('rosac.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: workAreaPath('radioastronomia') },
  }
}

export const dynamic = 'force-dynamic'

export default async function RadioastronomiaRoute() {
  const [messages, people, canCreate, canEdit, canDelete] = await Promise.all([
    getMessages(),
    getResearchers(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  const content = getRosacInfoContent(messages as unknown as RosacMessages)

  return (
    <RosacInfoPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      content={{
        ...content,
        team: { ...content.team, people },
      }}
    />
  )
}
