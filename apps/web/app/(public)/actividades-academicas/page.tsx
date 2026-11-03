import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import { AcademicActivitiesPage } from '@/app/components/public/news/AcademicActivitiesPage'
import { getAcademicActivitiesPage } from '@/app/lib/academic-activities'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  isListingUrl,
  listingHref,
  PAGE_PARAM,
  parsePageParam,
  type SearchParamValue,
} from '@/app/lib/pagination'
import { parseSearchParam, SEARCH_PARAM } from '@/app/lib/search-query'

const ACTIVITIES_PATH = '/actividades-academicas'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academicActivities.listPage')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

interface AcademicActivitiesLoaderProps {
  searchParams: Promise<Record<string, SearchParamValue>>
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

async function AcademicActivitiesLoader({
  searchParams,
  canCreate,
  canEdit,
  canDelete,
}: AcademicActivitiesLoaderProps) {
  const params = await searchParams
  const locale = resolveLocale(await getLocale())
  const activities = await getAcademicActivitiesPage(locale, {
    query: parseSearchParam(params[SEARCH_PARAM]),
    page: parsePageParam(params[PAGE_PARAM]),
  })

  if (!isListingUrl(params, activities)) {
    redirect(listingHref(ACTIVITIES_PATH, activities))
  }

  return (
    <AcademicActivitiesPage
      activities={activities.activities}
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      page={activities.page}
      query={activities.query}
      totalItems={activities.totalItems}
      totalPages={activities.totalPages}
    />
  )
}

interface ActividadesAcademicasPageProps {
  searchParams: Promise<Record<string, SearchParamValue>>
}

export default async function ActividadesAcademicasPage({
  searchParams,
}: ActividadesAcademicasPageProps) {
  const [canCreate, canEdit, canDelete] = await Promise.all([
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <Suspense fallback={<AcademicActivitiesPage loading={true} />}>
      <AcademicActivitiesLoader
        canCreate={canCreate}
        canDelete={canDelete}
        canEdit={canEdit}
        searchParams={searchParams}
      />
    </Suspense>
  )
}
