'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Notice } from '@/app/components/public/Notice'
import { Pagination } from '@/app/components/public/Pagination'
import { SearchBar } from '@/app/components/public/SearchBar'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { LoadingRegion } from '@/app/components/public/skeleton/LoadingRegion'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import {
  buildCreateRequest,
  buildUpdateRequest,
  emptyInitial,
  type AcademicActivityDraft,
  type AcademicActivityFormInitial,
} from '@/app/lib/academic-activities-form'
import type { AcademicActivity, ReviewConfirmation } from '@/app/lib/academic-activities'
import { listingHref, PAGE_SIZE } from '@/app/lib/pagination'
import { parseSearchParam } from '@/app/lib/search-query'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityForm, type AcademicActivityFormHandle } from './AcademicActivityForm'
import { EditableAcademicActivityCard } from './EditableAcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities?: AcademicActivity[]
  query?: string
  page?: number
  totalItems?: number
  totalPages?: number
  loading?: boolean
  error?: string | null
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * The dedicated `/actividades-academicas` screen — same hero/back-link shell as every other
 * topic page, and the same `AcademicActivityCard` the `/noticias` teaser section uses, so both
 * surfaces stay visually identical without duplicating the card itself.
 */
export function AcademicActivitiesPage({
  activities = [],
  query = '',
  page = 1,
  totalItems = activities.length,
  totalPages = Math.ceil(totalItems / PAGE_SIZE),
  loading = false,
  error = null,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: AcademicActivitiesPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('academicActivities')
  const listT = useTranslations('academicActivities.listPage')
  const common = useTranslations('common')
  const sendWithFeedback = useRequestFeedback()
  const { editMode } = useEditMode()
  const [input, setInput] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const [busy, setBusy] = useState(false)
  const [navigating, startNavigation] = useTransition()
  const section = useRef<HTMLElement>(null)
  const shownPage = useRef(page)
  // One request at a time: a second click while the first is in flight would send the same
  // version again and could create or change the same activity twice.
  const pending = useRef(false)
  const createForm = useRef<AcademicActivityFormHandle>(null)
  const [createInitial, setCreateInitial] = useState<AcademicActivityFormInitial>(emptyInitial)

  if (query !== syncedQuery) {
    setSyncedQuery(query)
    if (parseSearchParam(input) !== query) setInput(query)
  }

  const search = useCallback(
    (next: string) => {
      startNavigation(() => {
        router.replace(listingHref(pathname, { query: next }), { scroll: false })
      })
    },
    [pathname, router],
  )

  useEffect(() => {
    const next = parseSearchParam(input)
    if (next === query) return

    const timer = setTimeout(() => search(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [input, query, search])

  useEffect(() => {
    if (shownPage.current === page) return
    shownPage.current = page
    section.current?.focus()
  }, [page])

  const hasQuery = query !== ''
  const firstShown = (page - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(page * PAGE_SIZE, totalItems)
  const summary = [
    hasQuery && totalItems > 0 ? listT('results', { count: totalItems }) : null,
    totalPages <= 1
      ? null
      : firstShown === lastShown
        ? listT('rangeOne', { position: firstShown, total: totalItems })
        : listT('range', { from: firstShown, to: lastShown, total: totalItems }),
  ]
    .filter(Boolean)
    .join(' ')

  /**
   * Sends one request and reports its outcome in a toast through `useRequestFeedback`. On failure
   * nothing else happens: the form stays open with the admin's input and the list is not
   * refreshed. `router.refresh()` re-runs the server component's `getAcademicActivitiesPage()` so
   * the list reflects a saved change immediately, without an optimistic guess.
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

  async function handleSave(
    id: string,
    initial: AcademicActivityFormInitial,
    draft: AcademicActivityDraft,
    confirmed: ReviewConfirmation[],
    newPhotoUrl: string | null,
    close: () => void,
  ) {
    const body = buildUpdateRequest(initial, draft, confirmed, newPhotoUrl)
    if (!body) {
      close()
      return
    }

    await send(
      `/api/academic-activities/${id}`,
      jsonRequest('PATCH', body),
      { success: t('updated'), fallback: t('errors.saveUnknown') },
      close,
    )
  }

  async function handleCreate(
    draft: AcademicActivityDraft,
    newPhotoUrl: string | null,
    close: () => void,
  ) {
    await send(
      '/api/academic-activities',
      jsonRequest('POST', buildCreateRequest(draft, newPhotoUrl ?? '')),
      { success: t('created'), fallback: t('errors.saveUnknown') },
      () => {
        setCreateInitial(emptyInitial())
        close()
      },
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

  return (
    <article className="topic-page">
      <TopicHero kicker={listT('kicker')} lead={listT('lead')} title={listT('title')} />

      <section
        aria-label={listT('title')}
        aria-busy={navigating || undefined}
        className="academic-activities-explorer page-width"
        ref={section}
        tabIndex={-1}
      >
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
          ) : (
            <div className="academic-activities-list academic-activities-list-standalone">
              {totalItems === 0 ? (
                <p className="content-empty" role="status">
                  {hasQuery ? listT('emptyQuery', { query }) : t('section.empty')}
                </p>
              ) : null}
              {editMode && canCreate ? (
                <AddItemCard
                  label={t('editor.addCard')}
                  onRequestClose={(close) => {
                    if (createForm.current) createForm.current.requestCancel()
                    else close()
                  }}
                  size="large"
                >
                  {({ close }) => (
                    <AcademicActivityForm
                      busy={busy}
                      initial={createInitial}
                      onCancel={close}
                      onSave={(draft, _confirmed, newPhotoUrl) =>
                        handleCreate(draft, newPhotoUrl, close)
                      }
                      ref={createForm}
                    />
                  )}
                </AddItemCard>
              ) : null}

              {activities.map((activity) => (
                <EditableAcademicActivityCard
                  activity={activity}
                  busy={busy}
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={activity.id}
                  onDelete={() => handleDelete(activity.id)}
                  onSave={(initial, draft, confirmed, newPhotoUrl, close) =>
                    handleSave(activity.id, initial, draft, confirmed, newPhotoUrl, close)
                  }
                />
              ))}
            </div>
          )}
        </LoadingRegion>

        <Pagination
          currentPage={page}
          hrefForPage={(target) => listingHref(pathname, { query, page: target })}
          label={listT('paginationLabel')}
          scroll={false}
          totalPages={totalPages}
        />
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}

/** How long typing has to pause before the search updates the URL. */
export const SEARCH_DELAY_MS = 300
