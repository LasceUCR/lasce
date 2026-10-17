'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useMessages, useTranslations } from 'next-intl'

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

import { EditableNewsCard } from './EditableNewsCard'
import { NewsArticleForm, type NewsArticleFormHandle } from './NewsArticleForm'

export interface NewsExplorerProps {
  /** Already in the site's language and in chronological order (newest first). */
  news: NewsArticle[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function NewsExplorer({
  news,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: NewsExplorerProps) {
  const router = useRouter()
  // The page's copy and the editor's messages follow the site's language.
  const t = useTranslations('news')
  const uiLocale = resolveLocale(useLocale())
  const errorMessages = useMessages().news.errors
  const feedback = useTranslations('common.feedback')
  const sendWithFeedback = useRequestFeedback()
  const [query, setQuery] = useState('')
  const { editMode } = useEditMode()
  const [busy, setBusy] = useState(false)
  // One request at a time: a second click while the first is in flight would send the same
  // version again and come back as a false conflict.
  const pending = useRef(false)
  const createForm = useRef<NewsArticleFormHandle>(null)
  const [createInitial, setCreateInitial] = useState<NewsFormInitial>(emptyInitial)

  // Filters the items as shown, so a search matches the language the visitor is reading.
  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return news
    }

    return news.filter(
      (article) =>
        matches(article.title, query) ||
        matches(article.authors, query) ||
        matches(article.source, query) ||
        matches(article.abstract, query),
    )
  }, [news, query])

  const hasQuery = query.trim() !== ''

  /**
   * Sends one request and reports its outcome in a toast through `useRequestFeedback`. On failure
   * the form stays open with the admin's input. On success `router.refresh()` re-runs the server
   * component's `getNews()`.
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
      <h2 id="news-title">{t('page.recent')}</h2>

      <SearchBar
        label={t('page.searchLabel')}
        onQueryChange={setQuery}
        placeholder={t('page.searchPlaceholder')}
        query={query}
      />

      {hasQuery ? (
        <p aria-live="polite" className="sr-only">
          {t('page.results', { count: filtered.length })}
        </p>
      ) : null}

      {filtered.length === 0 && !(editMode && canCreate) ? (
        <p className="content-empty" role="status">
          {hasQuery ? t('page.emptyQuery', { query }) : t('page.empty')}
        </p>
      ) : (
        <div className="news-list">
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

          {filtered.map((article) => (
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
    </section>
  )
}
