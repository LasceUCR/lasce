'use client'

import { useEffect, useRef, useState } from 'react'
import { Code, GraduationCap, Satellite, Sun, Users, Waves, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { EditableResearcherCard } from '@/app/components/public/rosac/EditableResearcherCard'
import {
  ResearcherForm,
  type ResearcherFormValues,
} from '@/app/components/public/rosac/ResearcherForm'
import { TeamGallery } from '@/app/components/public/rosac/TeamGallery'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { readFailureReason } from '@/app/lib/api-feedback'
import type { NosotrosCardIcon, NosotrosContent } from '@/app/lib/nosotros'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { NosotrosActivityForm, type NosotrosActivityFormValues } from './NosotrosActivityForm'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

const icons: Record<NosotrosCardIcon, LucideIcon> = {
  sun: Sun,
  waves: Waves,
  satellite: Satellite,
  code: Code,
  collaboration: Users,
  education: GraduationCap,
}

/** Starting point for a brand-new card — the form just needs some valid icon selected. */
const blankActivity: NosotrosActivityFormValues = { icon: 'sun', title: '', description: '' }

export interface NosotrosPageProps {
  content: NosotrosContent
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function NosotrosPage({
  content,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: NosotrosPageProps) {
  const router = useRouter()
  const t = useTranslations('nosotros.activities')
  const toast = useToast()
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  // The error toast from the last failed create, edit or delete, replaced by the next attempt.
  const activityErrorToast = useRef<number | null>(null)
  const [researcherCreateError, setResearcherCreateError] = useState<string | null>(null)
  const [researcherListError, setResearcherListError] = useState<string | null>(null)
  const researcherCreateErrorRef = useRef<HTMLParagraphElement>(null)

  // Scrolls the "Añadir investigador" error into view as soon as it appears —
  // same reasoning as `ResearcherForm`'s own upload error.
  useEffect(() => {
    if (researcherCreateError) {
      scrollIntoViewIfSupported(researcherCreateErrorRef.current)
    }
  }, [researcherCreateError])

  const editingActivity = content.activities.items.find((item) => item.id === editingActivityId)

  function openEditor(id: string) {
    setEditingActivityId(id)
  }

  function closeEditor() {
    setEditingActivityId(null)
  }

  /**
   * Sends a create, edit or delete and reports a failure in a toast that states the server's
   * reason when it gave one. Nothing changes on the page until the request succeeds: a create or
   * edit keeps its modal open with the admin's input. Returns whether the request succeeded.
   */
  async function sendActivityRequest(
    url: string,
    init: RequestInit,
    fallback: 'errors.unknown' | 'errors.deleteUnknown',
  ): Promise<boolean> {
    if (activityErrorToast.current !== null) {
      toast.dismiss(activityErrorToast.current)
      activityErrorToast.current = null
    }

    let response: Response
    try {
      response = await fetch(url, init)
    } catch {
      activityErrorToast.current = toast.show('error', t('errors.network'))
      return false
    }

    if (!response.ok) {
      const reason =
        (await readFailureReason(response)) ??
        (response.status >= 500 ? t('errors.server') : t(fallback))
      activityErrorToast.current = toast.show('error', reason)
      return false
    }

    return true
  }

  function submitActivity(
    url: string,
    method: 'POST' | 'PATCH',
    values: NosotrosActivityFormValues,
  ) {
    return sendActivityRequest(
      url,
      { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) },
      'errors.unknown',
    )
  }

  async function handleSaveActivity(values: NosotrosActivityFormValues) {
    if (!editingActivityId) return

    const saved = await submitActivity(
      `/api/nosotros/activities/${editingActivityId}`,
      'PATCH',
      values,
    )
    if (!saved) return

    closeEditor()
    // Re-runs the server component's `getNosotrosActivities()` so the page
    // reflects the saved change immediately, without an optimistic guess.
    router.refresh()
    toast.show('success', t('updated'))
  }

  async function handleCreateActivity(values: NosotrosActivityFormValues, close: () => void) {
    const saved = await submitActivity('/api/nosotros/activities', 'POST', values)
    if (!saved) return

    close()
    router.refresh()
    toast.show('success', t('created'))
  }

  async function handleDeleteActivity(id: string) {
    const deleted = await sendActivityRequest(
      `/api/nosotros/activities/${id}`,
      { method: 'DELETE' },
      'errors.deleteUnknown',
    )
    if (!deleted) return

    router.refresh()
    toast.show('success', t('deleted'))
  }

  async function handleSaveResearcher(
    id: string,
    values: ResearcherFormValues,
  ): Promise<string | null> {
    let response: Response
    try {
      response = await fetch(`/api/nosotros/researchers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      return SAVE_ERROR_MESSAGE
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      return body?.error ?? SAVE_ERROR_MESSAGE
    }

    // Re-runs the server component's `getNosotrosResearchers()` so the page
    // reflects the saved change immediately, without an optimistic guess.
    router.refresh()
    return null
  }

  async function handleCreateResearcher(values: ResearcherFormValues, close: () => void) {
    setResearcherCreateError(null)

    let response: Response
    try {
      response = await fetch('/api/nosotros/researchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setResearcherCreateError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setResearcherCreateError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    close()
    router.refresh()
  }

  async function handleDeleteResearcher(id: string) {
    setResearcherListError(null)

    let response: Response
    try {
      response = await fetch(`/api/nosotros/researchers/${id}`, { method: 'DELETE' })
    } catch {
      setResearcherListError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setResearcherListError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    router.refresh()
  }

  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      {content.flag ? <ContentFlag {...content.flag} /> : null}

      <TopicSection title={content.overview.title} titleId="nosotros-overview-title" wide>
        {content.overview.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.activities.title} titleId="nosotros-activities-title" index="1">
        {editMode && canCreate && content.activities.items.length === 0 ? (
          <p className="topic-intro">
            Haga clic en &quot;Añadir&quot; para agregar alguna actividad.
          </p>
        ) : null}

        <CardGrid columns={3} equalHeight>
          {content.activities.items.map((item) => {
            const Icon = icons[item.icon]
            const icon = <Icon size={22} strokeWidth={1.8} />
            const showEditor = editMode && (canEdit || canDelete)

            if (!showEditor) {
              return (
                <InfoCard
                  key={item.id}
                  description={item.description}
                  icon={icon}
                  title={item.title}
                />
              )
            }

            return (
              <EditableWrapper
                key={item.id}
                deleteConfirmMessage={`¿Desea eliminar "${item.title}"? Esta acción no se puede deshacer.`}
                deleteConfirmTitle="Eliminar actividad"
                deleteLabel={`Eliminar ${item.title}`}
                editLabel={`Editar ${item.title}`}
                onDelete={canDelete ? () => handleDeleteActivity(item.id) : undefined}
                onEdit={canEdit ? () => openEditor(item.id) : undefined}
              >
                <InfoCard description={item.description} icon={icon} title={item.title} />
              </EditableWrapper>
            )
          })}

          {editMode && canCreate ? (
            <AddItemCard label="Añadir">
              {({ close }) => (
                <NosotrosActivityForm
                  activity={blankActivity}
                  onCancel={close}
                  onSave={(values) => handleCreateActivity(values, close)}
                  requireConfirmation={false}
                />
              )}
            </AddItemCard>
          ) : null}
        </CardGrid>
      </TopicSection>

      <TopicSection
        id="investigadores"
        index="2"
        intro={content.researchers.intro}
        title={content.researchers.title}
        titleId="nosotros-researchers-title"
        wide
      >
        {researcherListError ? (
          <p className="form-alert" role="alert">
            {researcherListError}
          </p>
        ) : null}

        <TeamGallery
          emptyMessage={content.researchers.emptyMessage}
          hint={content.researchers.hint}
          label={content.researchers.title}
          people={content.researchers.people}
          renderPerson={(person) => (
            <EditableResearcherCard
              canDelete={canDelete}
              canEdit={canEdit}
              onDelete={() => handleDeleteResearcher(person.id)}
              onSave={(values) => handleSaveResearcher(person.id, values)}
              researcher={person}
            />
          )}
          trailingSlide={
            editMode && canCreate ? (
              <AddItemCard label="Añadir investigador">
                {({ close }) => (
                  <>
                    {researcherCreateError ? (
                      <p className="form-alert" ref={researcherCreateErrorRef} role="alert">
                        {researcherCreateError}
                      </p>
                    ) : null}
                    <ResearcherForm
                      confirmMessage="¿Desea agregar este investigador?"
                      confirmTitle="Agregar investigador"
                      onCancel={() => {
                        setResearcherCreateError(null)
                        close()
                      }}
                      onSave={(values) => handleCreateResearcher(values, close)}
                      researcher={null}
                    />
                  </>
                )}
              </AddItemCard>
            ) : undefined
          }
        />
      </TopicSection>

      <TopicSection
        title={content.contribution.title}
        titleId="nosotros-contribution-title"
        featured
      >
        {content.contribution.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.vision.title} titleId="nosotros-vision-title" wide>
        {content.vision.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>

      <Modal
        onClose={closeEditor}
        open={editingActivity !== undefined}
        title={editingActivity ? `Editar "${editingActivity.title}"` : 'Editar actividad'}
      >
        {editingActivity ? (
          <NosotrosActivityForm
            activity={editingActivity}
            onCancel={closeEditor}
            onSave={handleSaveActivity}
          />
        ) : null}
      </Modal>
    </article>
  )
}
