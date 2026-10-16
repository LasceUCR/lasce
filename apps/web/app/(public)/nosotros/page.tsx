import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import {
  getNosotrosActivities,
  getNosotrosResearchers,
  getNosotrosContent,
} from '@/app/lib/nosotros'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nosotros.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/nosotros' },
  }
}

export const dynamic = 'force-dynamic'

export default async function NosotrosRoute() {
  const [messages, activities, researchers, canCreate, canEdit, canDelete] = await Promise.all([
    getMessages(),
    getNosotrosActivities(),
    getNosotrosResearchers(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  const content = getNosotrosContent(messages)

  return (
    <NosotrosPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      content={{
        ...content,
        activities: { title: content.activities.title, items: activities },
        researchers: { ...content.researchers, people: researchers },
      }}
    />
  )
}
