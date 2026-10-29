import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { pageItems } from '@/app/lib/pagination'

import styles from './Pagination.module.css'

export interface PaginationProps {
  /** The page shown, from 1. A value outside `1..totalPages` is shown as the nearest page. */
  currentPage: number
  totalPages: number
  /** The URL of a page, for example `(page) => listingHref('/noticias', { query, page })`. */
  hrefForPage: (page: number) => string
  /** Names the navigation landmark ("Páginas de noticias"); defaults to "Paginación". */
  label?: string
  /**
   * Whether following a link scrolls to the top of the page, as a Next.js `<Link>` does. Pass
   * `false` when the listing moves focus to its own heading instead.
   */
  scroll?: boolean
  className?: string
}

/**
 * Page controls for a listing: previous and next, and the page numbers with gaps (`1 … 5 6 7 …
 * 12`). Every page is a real link, so the browser's back and forward buttons, reloading and
 * opening a page in a new tab all work, and it renders on the server as well.
 *
 * It renders nothing when everything fits on one page. On a narrow screen the numbers give way to
 * "Página 6 de 12" between the two arrows.
 */
export function Pagination({
  currentPage,
  totalPages,
  hrefForPage,
  label,
  scroll = true,
  className,
}: PaginationProps) {
  const t = useTranslations('common.pagination')

  if (totalPages <= 1) return null

  const page = Math.min(Math.max(Math.trunc(currentPage) || 1, 1), totalPages)
  const items = pageItems(page, totalPages)

  function step(target: number, direction: 'previous' | 'next') {
    const text = t(direction)
    const icon =
      direction === 'previous' ? (
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
      ) : (
        <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
      )
    const content = (
      <>
        {direction === 'previous' && icon}
        <span className={styles.stepLabel}>{text}</span>
        {direction === 'next' && icon}
      </>
    )

    // Past either end there is nowhere to go: shown dimmed, but not a link, and left out for
    // assistive technology, which hears only the steps that lead somewhere.
    if (target < 1 || target > totalPages) {
      return (
        <span aria-hidden="true" className={`${styles.step} ${styles.disabled}`}>
          {content}
        </span>
      )
    }

    return (
      <Link
        className={styles.step}
        href={hrefForPage(target)}
        rel={direction === 'previous' ? 'prev' : 'next'}
        scroll={scroll}
      >
        {content}
      </Link>
    )
  }

  return (
    <nav
      aria-label={label ?? t('label')}
      className={className ? `${styles.pagination} ${className}` : styles.pagination}
    >
      {step(page - 1, 'previous')}

      <ol className={styles.pages}>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li aria-hidden="true" className={styles.gap} key={`gap-${index}`}>
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('page', { page: item })}
                className={item === page ? `${styles.page} ${styles.current}` : styles.page}
                href={hrefForPage(item)}
                scroll={scroll}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      <p className={styles.status}>{t('status', { page, total: totalPages })}</p>

      {step(page + 1, 'next')}
    </nav>
  )
}
