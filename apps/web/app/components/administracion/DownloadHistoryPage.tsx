import { useFormatter, useTranslations } from 'next-intl'

import { Pagination } from '@/app/components/public/Pagination'
import type {
  DownloadHistoryItem,
  DownloadHistoryPage as DownloadHistoryData,
} from '@/app/lib/download-history'

import { DownloadHistoryFilters } from './DownloadHistoryFilters'
import tableStyles from './UsersRolesTable.module.css'

export interface DownloadHistoryPageProps {
  title: string
  description: string
  /** The route the filters and the page links point at, e.g. `/administracion/descargas`. */
  pathname: string
  history: DownloadHistoryData
}

/** Downloads are shown in UTC, like `/datos`, so a record reads the same for every administrator. */
const TIME_ZONE = 'UTC'

/** The URL of `page` of the history narrowed by `filters`; page 1 and empty filters are left out. */
export function downloadHistoryHref(
  pathname: string,
  filters: DownloadHistoryData['filters'],
  page: number,
): string {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.source) params.set('source', filters.source)
  if (filters.instrument) params.set('instrument', filters.instrument)
  if (filters.format) params.set('format', filters.format)
  if (filters.user) params.set('user', filters.user)
  if (page > 1) params.set('page', String(page))

  const search = params.toString()
  return search === '' ? pathname : `${pathname}?${search}`
}

/** The queried day and time window, e.g. `2026-10-15 00:00–23:59`; empty when none was recorded. */
export function queriedRange(item: DownloadHistoryItem): string {
  const times = item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : ''
  return [item.date, times].filter(Boolean).join(' ')
}

/**
 * The Descargas section: filters, the downloads of one page, and the page controls. It follows the
 * Auditoría section: the filters are a plain GET form, so applying them restarts at the first page
 * and the page stays in the URL. Read-only: it never offers the files again.
 */
export function DownloadHistoryPage({
  title,
  description,
  pathname,
  history,
}: DownloadHistoryPageProps) {
  const t = useTranslations('administration.downloads')
  const format = useFormatter()
  const { filters, options, items } = history
  const filtered = Object.values(filters).some((value) => value !== '')

  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <section className="surface-card admin-panel" aria-labelledby="download-history-title">
        <h2 id="download-history-title" className="sr-only">
          {t('table.label')}
        </h2>

        <DownloadHistoryFilters
          pathname={pathname}
          filters={filters}
          options={options}
          filtered={filtered}
        />

        {items.length === 0 ? (
          <p className="audit-empty">{filtered ? t('emptyFiltered') : t('empty')}</p>
        ) : (
          <>
            <p className="audit-count" role="status">
              {t('results', { count: history.totalItems })} ·{' '}
              {t('pageSummary', { page: history.page, total: history.totalPages })}
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
                    <th scope="col">{t('table.user')}</th>
                    <th scope="col">{t('table.source')}</th>
                    <th scope="col">{t('table.instrument')}</th>
                    <th scope="col">{t('table.product')}</th>
                    <th scope="col">{t('table.format')}</th>
                    <th scope="col">{t('table.range')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="audit-date" data-label={t('table.date')}>
                        <time dateTime={item.downloadedAt}>
                          {format.dateTime(new Date(item.downloadedAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: TIME_ZONE,
                          })}
                        </time>
                      </td>
                      <td data-label={t('table.user')}>{item.userName ?? t('deletedUser')}</td>
                      <td data-label={t('table.source')}>{item.source}</td>
                      <td data-label={t('table.instrument')}>{item.instrument}</td>
                      <td data-label={t('table.product')}>{item.product}</td>
                      <td data-label={t('table.format')}>{item.format.toUpperCase()}</td>
                      <td className="audit-date" data-label={t('table.range')}>
                        {queriedRange(item) || t('noRange')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="audit-pagination">
              <Pagination
                currentPage={history.page}
                totalPages={history.totalPages}
                label={t('paginationLabel')}
                hrefForPage={(page) => downloadHistoryHref(pathname, filters, page)}
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
