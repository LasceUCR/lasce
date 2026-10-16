import { useTranslations } from 'next-intl'

import type { ActivityItem } from '@/app/lib/audit-log'
import type { ContentSummary } from '@/app/lib/summary-cards'

import { ContentSummaryCards } from './ContentSummaryCards'
import { RecentActivityPanel } from './RecentActivityPanel'
import { LiveServicesPanel } from './ServicesPanel'

export interface ResumenPageProps {
  summary: ContentSummary
  activity: ActivityItem[]
  now: Date
}

export function ResumenPage({ summary, activity, now }: ResumenPageProps) {
  const t = useTranslations('administration.summary')

  return (
    <div>
      <div className="section-heading">
        <h1>{t('title')}</h1>
        <p>{t('description')}</p>
      </div>

      <ContentSummaryCards summary={summary} />

      <RecentActivityPanel items={activity} now={now} />

      <div className="section-heading admin-panel">
        <h2>{t('infrastructureTitle')}</h2>
      </div>
      <LiveServicesPanel />
    </div>
  )
}
