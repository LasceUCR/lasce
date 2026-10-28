'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useMessages, useTranslations } from 'next-intl'

import { Pagination } from '@/app/components/public/Pagination'
import { SearchBar } from '@/app/components/public/SearchBar'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { parseApiError } from '@/app/lib/cms/save'
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  buildCreateRequest,
  buildUpdateRequest,
  describeNewsFailure,
  emptyInitial,
  type NewsDraft,
  type NewsFormInitial,
} from '@/app/lib/news-form'
import type { NewsArticle, ReviewConfirmation } from '@/app/lib/news-schema'
import { listingHref, PAGE_SIZE } from '@/app/lib/pagination'
import { parseSearchParam } from '@/app/lib/search-query'

import { EditableNewsCard } from './EditableNewsCard'
import { NewsArticleForm, type NewsArticleFormHandle } from './NewsArticleForm'

export interface NewsExplorerProps {
  /**
   * The items on the page shown, already searched, ordered and cut to the page on the server
   * (`getNewsPage`), and in the site's language.
   */
  news: NewsArticle[]
  /** The search the server applied; `''` for none. */
  query?: string
  /** The page shown, from 1. */
  page?: number
  /** Matching items across every page. Defaults to the items given. */
  totalItems?: number
  /** Defaults to what `totalItems` fills at `PAGE_SIZE` per page. */
  totalPages?: number
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

/** How long typing has to pause before the search runs. */
export const SEARCH_DELAY_MS = 300

function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function NewsExplorer({
  news,
  query = '',
  page = 1,
  totalItems = news.length,
  totalPages = Math.ceil(totalItems / PAGE_SIZE),
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: NewsExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()
  // The page's copy and the editor's messages follow the site's language.
  const t = useTranslations('news')
  const uiLocale = resolveLocale(useLocale())
  const errorMessages = useMessages().news.errors
  const feedback = useTranslations('common.feedback')
  const sendWithFeedback = useRequestFeedback()
  // What is typed in the search box. The URL, and so `query`, follows it once typing pauses.
  const [input, setInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const [navigating, startNavigation] = useTransition()
  const heading = useRef<HTMLHeadingElement>(null)
  const shownPage = useRef(page)
  const { editMode } = useEditMode()
  const [busy, setBusy] = useState(false)
  // One request at a time: a second click while the first is in flight would send the same
  // version again and come back as a false conflict.
  const pending = useRef(false)
  const createForm = useRef<NewsArticleFormHandle>(null)
  const [createInitial, setCreateInitial] = useState<NewsFormInitial>(emptyInitial)

  // The URL changed without the box: back or forward, or a link. Show its search in the box,
  // unless the box already says the same (say, with a trailing space still being typed).
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    if (parseSearchParam(input) !== query) setInput(query)
  }

  /** Shows the first page of the results for `next`, replacing the URL instead of adding one. */
  const search = useCallback(
    (next: string) => {
      startNavigation(() => {
        router.replace(listingHref(pathname, { query: next }), { scroll: false })
      })
    },
    [pathname, router],
  )

  // Searches once typing pauses. The server searches the whole collection, in the language the
  // visitor reads, and a new search starts again from the first page.
  useEffect(() => {
    const next = parseSearchParam(input)
    if (next === query) return

    const timer = setTimeout(() => search(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [input, query, search])

  // A new page moves focus to the list's heading, so keyboard and screen reader users start
  // reading the new items instead of staying on the link they followed at the bottom.
  useEffect(() => {
    if (shownPage.current === page) return
    shownPage.current = page
    heading.current?.focus()
  }, [page])

  const hasQuery = query !== ''
  const firstShown = (page - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(page * PAGE_SIZE, totalItems)
  const summary = [
    hasQuery && totalItems > 0 ? t('page.results', { count: totalItems }) : null,
    totalPages <= 1
      ? null
      : firstShown === lastShown
        ? t('page.rangeOne', { position: firstShown, total: totalItems })
        : t('page.range', { from: firstShown, to: lastShown, total: totalItems }),
  ]
    .filter(Boolean)
    .join(' ')

  /**
   * Sends one request and reports its outcome in a toast through `useRequestFeedback`. On failure
   * the form stays open with the admin's input. On success `router.refresh()` re-runs the server
   * component's `getNewsPage()` for the same search and page; when that page no longer exists the
   * page redirects to the last one.
   */
  async function send(
    url: string,
    init: RequestInit,
    messages: { success: string; fallback: string },
    onSuccess?: () => void,
  ) {
    if (pending.current) return
    pending.current = true
    setBusy(true)

    try {
      await sendWithFeedback(url, init, {
        ...messages,
        describeFailure: async (response) => {
          const body: unknown = await response.json().catch(() => null)
          // The list behind the editor is out of date: refresh it, so reopening the item loads
          // its current version. An open form keeps what was typed (it holds its own draft).
          if (response.status === 404 || parseApiError(body).code === 'conflict') router.refresh()
          return describeNewsFailure(response.status, body, uiLocale, {
            ...errorMessages,
            server: feedback('server'),
            fallback: messages.fallback,
          })
        },
        onSuccess: () => {
          onSuccess?.()
          router.refresh()
        },
      })
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function handleCreate(draft: NewsDraft, close: () => void) {
    await send(
      '/api/news',
      jsonRequest('POST', buildCreateRequest(draft)),
      { success: t('created'), fallback: t('errors.saveUnknown') },
      () => {
        setCreateInitial(emptyInitial())
        close()
      },
    )
  }

  async function handleSave(
    id: string,
    initial: NewsFormInitial,
    draft: NewsDraft,
    confirmed: ReviewConfirmation[],
    close: () => void,
  ) {
    const body = buildUpdateRequest(initial, draft, confirmed)
    if (!body) {
      close()
      return
    }

    await send(
      `/api/news/${id}`,
      jsonRequest('PATCH', body),
      { success: t('updated'), fallback: t('errors.saveUnknown') },
      close,
    )
  }

  async function handleDelete(id: string) {
    await send(
      `/api/news/${id}`,
      { method: 'DELETE' },
      { success: t('deleted'), fallback: t('errors.deleteUnknown') },
    )
  }

  return (
    <section aria-labelledby="news-title" className="news page-width">
      <h2 id="news-title" ref={heading} tabIndex={-1}>
        {t('page.recent')}
      </h2>

      <SearchBar
        label={t('page.searchLabel')}
        onQueryChange={setInput}
        onSubmit={() => {
          const next = parseSearchParam(input)
          if (next !== query) search(next)
        }}
        placeholder={t('page.searchPlaceholder')}
        query={input}
      />

      <p aria-live="polite" className={summary === '' ? 'sr-only' : 'news-summary'}>
        {summary}
      </p>

      {news.length === 0 && !(editMode && canCreate) ? (
        <p className="content-empty" role="status">
          {hasQuery ? t('page.emptyQuery', { query }) : t('page.empty')}
        </p>
      ) : (
        <div aria-busy={navigating || undefined} className="news-list">
          {editMode && canCreate && (
            <AddItemCard
              label={t('editor.addCard')}
              onRequestClose={(close) => {
                if (createForm.current) createForm.current.requestCancel()
                else close()
              }}
              size="large"
            >
              {({ close }) => (
                <NewsArticleForm
                  busy={busy}
                  initial={createInitial}
                  onCancel={close}
                  onSave={(draft) => handleCreate(draft, close)}
                  ref={createForm}
                />
              )}
            </AddItemCard>
          )}

          {news.map((article) => (
            <EditableNewsCard
              article={article}
              busy={busy}
              canDelete={canDelete}
              canEdit={canEdit}
              key={article.slug}
              onDelete={() => handleDelete(article.slug)}
              onSave={(initial, draft, confirmed, close) =>
                handleSave(article.slug, initial, draft, confirmed, close)
              }
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        hrefForPage={(target) => listingHref(pathname, { query, page: target })}
        label={t('page.paginationLabel')}
        scroll={false}
        totalPages={totalPages}
      />
    </section>
  )
}
