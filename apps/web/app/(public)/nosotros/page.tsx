import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
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
  const [messages, locale, canCreate, canEdit, canDelete] = await Promise.all([
    getMessages(),
    getLocale(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // Both languages and the version go to the browser only for someone who can edit.
  const [activities, researchers] = await Promise.all([
    getNosotrosActivities(resolveLocale(locale), { includeEditingData: canEdit }),
    getNosotrosResearchers(resolveLocale(locale), { includeEditingData: canEdit }),
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
