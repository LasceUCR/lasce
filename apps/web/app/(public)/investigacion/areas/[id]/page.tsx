import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ResearchAreaPage } from '@/app/components/public/research/ResearchAreaPage'
import { getResearchAreaById } from '@/app/lib/research-areas'

interface ResearchAreaRouteProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: ResearchAreaRouteProps): Promise<Metadata> {
  const { id } = await params
  const area = await getResearchAreaById(id)

  if (!area) {
    return {}
  }

  return {
    title: `${area.title} | Investigación | LASCE`,
    description: area.description,
  }
}

export default async function ResearchAreaRoute({ params }: ResearchAreaRouteProps) {
  const { id } = await params
  const area = await getResearchAreaById(id)

  if (!area) {
    notFound()
  }

  return <ResearchAreaPage area={area} />
}
