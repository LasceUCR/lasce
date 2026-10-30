'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { SearchBar } from '@/app/components/public/SearchBar'
import { Notice } from '@/app/components/public/Notice'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { AcademicActivity } from '@/app/lib/academic-activities'
import { listingHref } from '@/app/lib/pagination'
import { parseSearchParam, SEARCH_PARAM } from '@/app/lib/search-query'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityForm, type AcademicActivityFormValues } from './AcademicActivityForm'
import { EditableAcademicActivityCard } from './EditableAcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities?: AcademicActivity[]
  loading?: boolean
  error?: string | null
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function jsonRequest(method: 'POST' | 'PATCH', values: AcademicActivityFormValues): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }
}

/** How long typing has to pause before the search updates the URL. */
export const SEARCH_DELAY_MS = 300

/**
 * The dedicated `/actividades-academicas` screen — same hero/back-link shell as every other
 * topic page, and the same activity cards used by the `/noticias` teaser section.
 */
export function AcademicActivitiesPage({
  activities = [],
  loading = false,
  error = null,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: AcademicActivitiesPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryValues = searchParams.getAll(SEARCH_PARAM)
  const query = parseSearchParam(queryValues.length === 1 ? queryValues[0] : undefined)
  const t = useTranslations('academicActivities')
  const listT = useTranslations('academicActivities.listPage')
  const common = useTranslations('common')
  const sendWithFeedback = useRequestFeedback()
  const { editMode } = useEditMode()
  const [input, setInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)

  if (query !== syncedQuery) {
    setSyncedQuery(query)
    if (parseSearchParam(input) !== query) setInput(query)
  }

  const search = useCallback(
    (next: string) => {
      router.replace(listingHref(pathname, { query: next }), { scroll: false })
    },
    [pathname, router],
  )

  useEffect(() => {
    const next = parseSearchParam(input)
    if (next === query) return

    const timer = setTimeout(() => search(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [input, query, search])

  const normalizedQuery = query.toLocaleLowerCase()
  const filteredActivities = activities.filter((activity) =>
    [
      activity.title,
      activity.category,
      activity.date,
      activity.location,
      activity.description,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
  )
  const totalItems = filteredActivities.length
  const hasQuery = query !== ''
  const summary = hasQuery
    ? totalItems > 0
      ? listT('results', { count: totalItems })
      : ''
    : totalItems === 1
      ? listT('rangeOne', { position: 1, total: totalItems })
      : totalItems > 1
        ? listT('range', { from: 1, to: totalItems, total: totalItems })
        : ''

  /**
   * Sends one request and reports its outcome in a toast through `useRequestFeedback`. On failure
   * nothing else happens: the form stays open with the admin's input and the list is not
   * refreshed. `router.refresh()` re-runs the server component's `getAcademicActivities()` so the
   * list reflects a saved change immediately, without an optimistic guess.
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

  async function handleSave(id: string, values: AcademicActivityFormValues, close: () => void) {
    await send(
      `/api/academic-activities/${id}`,
      jsonRequest('PATCH', values),
      {
        success: t('updated'),
        fallback: t('errors.saveUnknown'),
      },
      close,
    )
  }

  async function handleCreate(values: AcademicActivityFormValues, close: () => void) {
    await send(
      '/api/academic-activities',
      jsonRequest('POST', values),
      { success: t('created'), fallback: t('errors.saveUnknown') },
      close,
    )
  }

  async function handleDelete(id: string) {
    await send(
      `/api/academic-activities/${id}`,
      { method: 'DELETE' },
      {
        success: t('deleted'),
        fallback: t('errors.deleteUnknown'),
      },
    )
  }

  const showEmptyState = totalItems === 0 && !(editMode && canCreate)

  return (
    <article className="topic-page">
      <TopicHero kicker={listT('kicker')} lead={listT('lead')} title={listT('title')} />

      <section aria-label={listT('title')} className="academic-activities-explorer page-width">
        <SearchBar
          label={listT('searchLabel')}
          onQueryChange={setInput}
          onSubmit={() => {
            const next = parseSearchParam(input)
            if (next !== query) search(next)
          }}
          placeholder={listT('searchPlaceholder')}
          query={input}
        />

        <p
          aria-live="polite"
          className={summary === '' ? 'sr-only' : 'academic-activities-summary'}
        >
          {summary}
        </p>

        <LoadingRegion
          id="academic-activities-loading-region"
          label={t('section.loading')}
          loading={loading}
          skeleton={
            <AcademicActivitiesListSkeleton
              className="academic-activities-list-standalone"
              count={3}
            />
          }
        >
          {error ? (
            <Notice role="alert" tone="error">
              {error}
            </Notice>
          ) : showEmptyState ? (
            <p className="content-empty" role="status">
              {hasQuery ? listT('emptyQuery', { query }) : t('section.empty')}
            </p>
          ) : (
            <div className="academic-activities-list academic-activities-list-standalone">
              {editMode && canCreate ? (
                <AddItemCard label={t('editor.addCard')} size="large">
                  {({ close }) => (
                    <AcademicActivityForm
                      activity={null}
                      busy={busy}
                      onCancel={close}
                      onSave={(values) => handleCreate(values, close)}
                    />
                  )}
                </AddItemCard>
              ) : null}

              {filteredActivities.map((activity) => (
                <EditableAcademicActivityCard
                  activity={activity}
                  busy={busy}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={activity.id}
                  onDelete={() => handleDelete(activity.id)}
                  onSave={(values, close) => handleSave(activity.id, values, close)}
                />
              ))}
            </div>
          )}
        </LoadingRegion>
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
