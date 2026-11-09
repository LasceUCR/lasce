'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Notice } from '@/app/components/public/Notice'
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

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityForm, type AcademicActivityFormHandle } from './AcademicActivityForm'
import { EditableAcademicActivityCard } from './EditableAcademicActivityCard'

export interface AcademicActivitiesPageProps {
  activities?: AcademicActivity[]
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
 * The dedicated `/actividades-academicas` screen, with the standard topic hero and back link.
 * Each `AcademicActivityCard` keeps the full activity description in this separate listing.
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
  const t = useTranslations('academicActivities')
  const listT = useTranslations('academicActivities.listPage')
  const common = useTranslations('common')
  const sendWithFeedback = useRequestFeedback()
  const { editMode } = useEditMode()
  const [busy, setBusy] = useState(false)
  // One request at a time: a second click while the first is in flight would send the same
  // version again and could create or change the same activity twice.
  const pending = useRef(false)
  const createForm = useRef<AcademicActivityFormHandle>(null)
  const [createInitial, setCreateInitial] = useState<AcademicActivityFormInitial>(emptyInitial)

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

      <LoadingRegion
        className="page-width"
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
        ) : activities.length === 0 && !editMode ? (
          <p className="content-empty" role="status">
            {t('section.empty')}
          </p>
        ) : (
          <div className="academic-activities-list academic-activities-list-standalone">
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

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
