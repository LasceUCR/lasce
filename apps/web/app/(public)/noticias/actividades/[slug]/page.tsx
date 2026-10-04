import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations } from 'next-intl/server'

import { AcademicActivityPage } from '@/app/components/public/news/AcademicActivityPage'
import { academicActivitySlugs, getAcademicActivity } from '@/app/lib/academic-activities'

interface AcademicActivityRouteProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return academicActivitySlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: AcademicActivityRouteProps): Promise<Metadata> {
  const { slug } = await params
  const messages = await getMessages()
  const activity = getAcademicActivity(slug, messages.academicActivities.items)

  if (!activity) {
    return {}
  }

  const t = await getTranslations('academicActivities.page')

  return {
    title: t('metaTitle', { title: activity.title }),
    description: activity.abstract,
  }
}

export default async function AcademicActivityRoute({ params }: AcademicActivityRouteProps) {
  const { slug } = await params
  const messages = await getMessages()
  const activity = getAcademicActivity(slug, messages.academicActivities.items)

  if (!activity) {
    notFound()
  }

  return <AcademicActivityPage activity={activity} />
}
