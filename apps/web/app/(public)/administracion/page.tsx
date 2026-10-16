import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ResumenPage } from '@/app/components/administracion/ResumenPage'
import { getRecentActivity } from '@/app/lib/audit-log'
import { requireUser } from '@/app/lib/auth/session'
import { getContentSummary } from '@/app/lib/content-summary'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('administration.summary')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export const dynamic = 'force-dynamic'

// The layout turns visitors away; this sends anonymous visitors to login and back here.
export default async function AdministracionPage() {
  await requireUser('/administracion')

  const [summary, activity] = await Promise.all([getContentSummary(), getRecentActivity()])

  return <ResumenPage activity={activity} now={new Date()} summary={summary} />
}
