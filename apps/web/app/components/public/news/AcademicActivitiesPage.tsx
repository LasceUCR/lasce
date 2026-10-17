'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import type { AcademicActivity } from '@/app/lib/academic-activities'

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

/**
 * The dedicated `/actividades-academicas` screen — same hero/back-link shell as every other
 * topic page, and the same `AcademicActivityCard` the `/noticias` teaser section uses, so both
 * surfaces stay visually identical without duplicating the card itself.
 */
export function AcademicActivitiesPage({
  activities,
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

  // Each handler reports its outcome in a toast through `useRequestFeedback`. On failure nothing
  // else happens: the form stays open with the admin's input and the list is not refreshed.
  // `router.refresh()` re-runs the server component's `getAcademicActivities()` so the list
  // reflects a saved change immediately, without an optimistic guess.

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

  return (
    <article className="topic-page">
      <TopicHero kicker={listT('kicker')} lead={listT('lead')} title={listT('title')} />

      {activities.length === 0 && !editMode ? (
        <p className="content-empty page-width" role="status">
          {t('section.empty')}
        </p>
      ) : (
        <div className="academic-activities-list academic-activities-list-standalone page-width">
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

          {activities.map((activity) => (
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

      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
