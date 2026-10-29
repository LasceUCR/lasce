import { useFormatter, useTranslations } from 'next-intl'

import { Pagination } from '@/app/components/public/Pagination'
import type { AuditTrailPage as AuditTrailData } from '@/app/lib/audit-trail'

import { AuditFilters } from './AuditFilters'
import { useAuditSummary } from './useAuditSummary'
import tableStyles from './UsersRolesTable.module.css'

export interface AuditTrailPageProps {
  title: string
  description: string
  /** The route the filters and the page links point at, e.g. `/administracion/auditoria`. */
  pathname: string
  trail: AuditTrailData
}

/** Costa Rica has no daylight saving time, so the events read the same all year. */
const TIME_ZONE = 'America/Costa_Rica'

/** The URL of `page` of the trail narrowed by `filters`; page 1 and empty filters are left out. */
export function auditTrailHref(
  pathname: string,
  filters: AuditTrailData['filters'],
  page: number,
): string {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.entityType) params.set('entity', filters.entityType)
  if (filters.action) params.set('action', filters.action)
  if (page > 1) params.set('page', String(page))

  const search = params.toString()
  return search === '' ? pathname : `${pathname}?${search}`
}

/**
 * The Auditoría section: filters, the events of one page, and the page controls. The filters are a
 * plain GET form, so applying them restarts at the first page and the page stays in the URL. The
 * event summaries are stored in Spanish, written when the event happened; everything around them
 * follows the site's language.
 */
export function AuditTrailPage({ title, description, pathname, trail }: AuditTrailPageProps) {
  const t = useTranslations('administration.audit')
  const format = useFormatter()
  const summarize = useAuditSummary()
  const { filters, options, items } = trail
  const filtered = Object.values(filters).some((value) => value !== '')

  function actorLabel(item: AuditTrailData['items'][number]) {
    if (item.actorType === 'user') return item.actorName ?? t('actors.deletedUser')
    return t(`actors.${item.actorType}`)
  }

  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <section className="surface-card admin-panel" aria-labelledby="audit-trail-title">
        <h2 id="audit-trail-title" className="sr-only">
          {t('table.label')}
        </h2>

        <AuditFilters pathname={pathname} filters={filters} options={options} filtered={filtered} />

        {items.length === 0 ? (
          <p className="audit-empty">{filtered ? t('emptyFiltered') : t('empty')}</p>
        ) : (
          <>
            <p className="audit-count" role="status">
              {t('results', { count: trail.totalItems })}
            </p>
            <div
              className={tableStyles.scroll}
              role="region"
              aria-label={t('table.label')}
              tabIndex={0}
            >
              <table className={`${tableStyles.table} audit-table`}>
                <thead>
                  <tr>
                    <th scope="col">{t('table.date')}</th>
                    <th scope="col">{t('table.actor')}</th>
                    <th scope="col">{t('table.action')}</th>
                    <th scope="col">{t('table.summary')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="audit-date" data-label={t('table.date')}>
                        <time dateTime={item.occurredAt}>
                          {format.dateTime(new Date(item.occurredAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: TIME_ZONE,
                          })}
                        </time>
                      </td>
                      <td data-label={t('table.actor')}>{actorLabel(item)}</td>
                      <td data-label={t('table.action')}>
                        <code className="audit-action">{item.action}</code>
                      </td>
                      <td data-label={t('table.summary')}>{summarize(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="audit-pagination">
              <Pagination
                currentPage={trail.page}
                totalPages={trail.totalPages}
                label={t('paginationLabel')}
                hrefForPage={(page) => auditTrailHref(pathname, filters, page)}
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
