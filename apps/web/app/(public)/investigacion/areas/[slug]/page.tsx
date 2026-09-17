import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ResearchAreaPage } from '@/app/components/public/research/ResearchAreaPage'
import { getResearchArea, researchAreaSlugs } from '@/app/lib/research-areas'

interface ResearchAreaRouteProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return researchAreaSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: ResearchAreaRouteProps): Promise<Metadata> {
  const { slug } = await params
  const area = getResearchArea(slug)

  if (!area) {
    return {}
  }

  return {
    title: `${area.title} | Investigación | LASCE`,
    description: area.description,
  }
}

export default async function ResearchAreaRoute({ params }: ResearchAreaRouteProps) {
  const { slug } = await params
  const area = getResearchArea(slug)

  if (!area) {
    notFound()
  }

  return <ResearchAreaPage area={area} />
}
