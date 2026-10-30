'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { SearchBar } from '@/app/components/public/SearchBar'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { AcademicActivity } from '@/app/lib/academic-activities'
import { listingHref } from '@/app/lib/pagination'
import { parseSearchParam, SEARCH_PARAM } from '@/app/lib/search-query'

import { AcademicActivityForm, type AcademicActivityFormValues } from './AcademicActivityForm'
import { EditableAcademicActivityCard } from './EditableAcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities: AcademicActivity[]
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
  activities,
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
  const summary = [
    hasQuery && totalItems > 0 ? listT('results', { count: totalItems }) : null,
    totalItems <= 1
      ? null
      : totalItems === 1
        ? listT('rangeOne', { position: 1, total: totalItems })
        : listT('range', { from: 1, to: totalItems, total: totalItems }),
  ]
    .filter(Boolean)
    .join(' ')

  async function handleSave(id: string, values: AcademicActivityFormValues, close: () => void) {
    await sendWithFeedback(`/api/academic-activities/${id}`, jsonRequest('PATCH', values), {
      success: t('updated'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  async function handleCreate(values: AcademicActivityFormValues, close: () => void) {
    await sendWithFeedback('/api/academic-activities', jsonRequest('POST', values), {
      success: t('created'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  async function handleDelete(id: string) {
    await sendWithFeedback(
      `/api/academic-activities/${id}`,
      { method: 'DELETE' },
      {
        success: t('deleted'),
        fallback: t('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
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

        {showEmptyState ? (
          <p className="content-empty" role="status">
            {hasQuery ? listT('emptyQuery', { query }) : t('section.empty')}
          </p>
        ) : (
          <div className="academic-activities-list academic-activities-list-standalone">
            {editMode && canCreate ? (
              <AddItemCard label="Agregar actividad" size="large">
                {({ close }) => (
                  <AcademicActivityForm
                    activity={null}
                    onCancel={close}
                    onSave={(values) => handleCreate(values, close)}
                  />
                )}
              </AddItemCard>
            ) : null}

            {filteredActivities.map((activity) => (
              <EditableAcademicActivityCard
                activity={activity}
                canDelete={canDelete}
                canEdit={canEdit}
                key={activity.id}
                onDelete={() => handleDelete(activity.id)}
                onSave={(values, close) => handleSave(activity.id, values, close)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
