import type { Metadata } from 'next'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  getResearchers,
  getRosacAcknowledgments,
  getRosacActivities,
  getRosacCharacteristics,
  getRosacInfoContent,
  getRosacInstruments,
  getRosacStages,
  type RosacMessages,
} from '@/app/lib/rosac'
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
  const [messages, locale, canCreate, canEdit, canDelete] = await Promise.all([
    getMessages(),
    getLocale(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  const resolvedLocale = resolveLocale(locale)
  const editOptions = { includeEditingData: canEdit }

  const [people, characteristics, activities, stages, instruments, acknowledgments] =
    await Promise.all([
      getResearchers(resolvedLocale, editOptions),
      getRosacCharacteristics(resolvedLocale, editOptions),
      getRosacActivities(resolvedLocale, editOptions),
      getRosacStages(resolvedLocale, editOptions),
      getRosacInstruments(resolvedLocale, editOptions),
      getRosacAcknowledgments(resolvedLocale, editOptions),
    ])

  const content = getRosacInfoContent(messages as unknown as RosacMessages)

  return (
    <RosacInfoPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      content={{
        ...content,
        characteristics: {
          ...content.characteristics,
          items: characteristics.length > 0 ? characteristics : content.characteristics.items,
        },
        activities: {
          ...content.activities,
          items: activities.length > 0 ? activities : content.activities.items,
        },
        construction: {
          ...content.construction,
          stages:
            stages.length > 0
              ? (stages as unknown as typeof content.construction.stages)
              : content.construction.stages,
        },
        instruments: {
          ...content.instruments,
          items: instruments.length > 0 ? instruments : content.instruments.items,
        },
        team: { ...content.team, people },
        acknowledgments: {
          ...content.acknowledgments,
          institutions:
            acknowledgments.length > 0 ? acknowledgments : content.acknowledgments.institutions,
        },
      }}
    />
  )
}
