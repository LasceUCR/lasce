import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
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
  const [
    messages,
    people,
    characteristics,
    activities,
    stages,
    instruments,
    acknowledgments,
    canCreate,
    canEdit,
    canDelete,
  ] = await Promise.all([
    getMessages(),
    getResearchers(),
    getRosacCharacteristics(),
    getRosacActivities(),
    getRosacStages(),
    getRosacInstruments(),
    getRosacAcknowledgments(),
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
