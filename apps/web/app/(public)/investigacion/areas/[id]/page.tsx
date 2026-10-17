import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { ResearchAreaPage } from '@/app/components/public/research/ResearchAreaPage'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getResearchAreaById } from '@/app/lib/research-areas'

interface ResearchAreaRouteProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

/** The area in the language chosen in the header (the `lasce_locale` cookie). */
async function loadArea(params: ResearchAreaRouteProps['params']) {
  const [{ id }, locale] = await Promise.all([params, getLocale()])
  return getResearchAreaById(id, resolveLocale(locale))
}

export async function generateMetadata({ params }: ResearchAreaRouteProps): Promise<Metadata> {
  const area = await loadArea(params)

  if (!area) {
    return {}
  }

  const t = await getTranslations('researchAreas.detail')
  return {
    title: t('metaTitle', { title: area.title }),
    description: area.description,
  }
}

export default async function ResearchAreaRoute({ params }: ResearchAreaRouteProps) {
  const area = await loadArea(params)

  if (!area) {
    notFound()
  }

  return <ResearchAreaPage area={area} />
}
