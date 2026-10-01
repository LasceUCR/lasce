import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

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
  const activity = getAcademicActivity(slug)

  if (!activity) {
    return {}
  }

  return {
    title: `${activity.title} | Noticias | LASCE`,
    description: activity.abstract,
  }
}

export default async function AcademicActivityRoute({ params }: AcademicActivityRouteProps) {
  const { slug } = await params
  const activity = getAcademicActivity(slug)

  if (!activity) {
    notFound()
  }

  return <AcademicActivityPage activity={activity} />
}
