import { History } from 'lucide-react'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'

import type { ActivityItem } from '@/app/lib/audit-log'

import { useAuditSummary } from './useAuditSummary'

export interface RecentActivityPanelProps {
  items: ActivityItem[]
  /** The reference for "hace 12 min", passed in so server and client render the same text. */
  now: Date
  /** Whether the user can view the audit log (/administracion/auditoria). */
  canViewAuditLog?: boolean
}

/** The URL in `/administracion/auditoria` filtered to this item's entity or action. */
export function auditItemHref(item: { entityType?: string | null; action?: string }): string {
  const pathname = '/administracion/auditoria'
  if (item.entityType) {
    return `${pathname}?entity=${encodeURIComponent(item.entityType)}`
  }
  if (item.action) {
    return `${pathname}?action=${encodeURIComponent(item.action)}`
  }
  return pathname
}

/**
 * The Actividad reciente card of the administration summary. The list area keeps the height of a
 * full list, so the page does not shift when there are fewer events or none.
 */
export function RecentActivityPanel({
  items,
  now,
  canViewAuditLog = false,
}: RecentActivityPanelProps) {
  const t = useTranslations('administration.activity')
  const format = useFormatter()
  const summarize = useAuditSummary()

  function actorLabel(item: ActivityItem) {
    if (item.actorType === 'user') return item.actorName ?? t('actors.deletedUser')
    return t(`actors.${item.actorType}`)
  }

  return (
    <section className="surface-card admin-panel" aria-labelledby="admin-activity-title">
      <div className="admin-activity-header">
        <h2 id="admin-activity-title">{t('title')}</h2>
        {canViewAuditLog ? (
          <Link href="/administracion/auditoria" className="admin-activity-view-all">
            {t('viewAll')}
          </Link>
        ) : null}
      </div>
      <div className="admin-activity-body">
        {items.length === 0 ? (
          <div className="admin-activity-empty">
            <span className="admin-activity-empty-icon" aria-hidden="true">
              <History size={28} strokeWidth={1.75} />
            </span>
            <p>{t('empty')}</p>
          </div>
        ) : (
          <ol className="admin-activity-list">
            {items.map((item, index) => {
              const summaryText = summarize(item)
              return (
                <li key={item.id}>
                  <span className="admin-activity-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <strong className="admin-activity-title">
                    {canViewAuditLog ? (
                      <Link href={auditItemHref(item)}>{summaryText}</Link>
                    ) : (
                      summaryText
                    )}
                  </strong>
                  <span className="admin-activity-time">
                    <time dateTime={item.occurredAt}>
                      {format.relativeTime(new Date(item.occurredAt), now)}
                    </time>{' '}
                    · {actorLabel(item)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
