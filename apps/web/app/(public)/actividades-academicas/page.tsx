import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AcademicActivitiesPage } from '@/app/components/public/news/AcademicActivitiesPage'
import { getAcademicActivities } from '@/app/lib/academic-activities'
import { userHasPermission } from '@/app/lib/auth/authorization'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academicActivities.listPage')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

export default async function ActividadesAcademicasPage() {
  const [activities, canCreate, canEdit, canDelete] = await Promise.all([
    getAcademicActivities(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <AcademicActivitiesPage
      activities={activities}
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
    />
  )
}
