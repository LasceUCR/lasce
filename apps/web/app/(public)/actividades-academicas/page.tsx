import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { AcademicActivitiesPage } from '@/app/components/public/news/AcademicActivitiesPage'
import { getAcademicActivities } from '@/app/lib/academic-activities'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academicActivities.listPage')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

export default async function ActividadesAcademicasPage() {
  const [locale, canCreate, canEdit, canDelete] = await Promise.all([
    getLocale(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  // The date shown on each card follows the language chosen in the header (the `lasce_locale`
  // cookie), same as `getResearchAreas`.
  const activities = await getAcademicActivities(resolveLocale(locale))

  return (
    <AcademicActivitiesPage
      activities={activities}
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
    />
  )
}
