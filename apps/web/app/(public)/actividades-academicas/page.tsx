import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { AcademicActivitiesPage } from '@/app/components/public/news/AcademicActivitiesPage'
import { getAcademicActivities } from '@/app/lib/academic-activities'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academicActivities.listPage')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

export default async function ActividadesAcademicasPage() {
  const messages = await getMessages()

  return (
    <AcademicActivitiesPage activities={getAcademicActivities(messages.academicActivities.items)} />
  )
}
