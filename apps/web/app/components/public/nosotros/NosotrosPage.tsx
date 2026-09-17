'use client'

import { useState } from 'react'
import { Code, GraduationCap, Satellite, Sun, Users, Waves, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { TeamGallery } from '@/app/components/public/rosac/TeamGallery'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { ContentFlag } from '@/app/components/public/topic/ContentFlag'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { NosotrosCardIcon, NosotrosContent } from '@/app/lib/nosotros'

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
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const editingActivity = content.activities.items.find((item) => item.id === editingActivityId)

  function openEditor(id: string) {
    setSaveError(null)
    setEditingActivityId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingActivityId(null)
  }

  async function handleSaveActivity(values: NosotrosActivityFormValues) {
    if (!editingActivityId) return

    let response: Response
    try {
      response = await fetch(`/api/nosotros/activities/${editingActivityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setSaveError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    closeEditor()
    // Re-runs the server component's `getNosotrosActivities()` so the page
    // reflects the saved change immediately, without an optimistic guess.
    router.refresh()
  }

  async function handleCreateActivity(values: NosotrosActivityFormValues, close: () => void) {
    setCreateError(null)

    let response: Response
    try {
      response = await fetch('/api/nosotros/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setCreateError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setCreateError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    close()
    router.refresh()
  }

  async function handleDeleteActivity(id: string) {
    setListError(null)

    let response: Response
    try {
      response = await fetch(`/api/nosotros/activities/${id}`, { method: 'DELETE' })
    } catch {
      setListError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setListError(body?.error ?? SAVE_ERROR_MESSAGE)
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
        {listError ? (
          <p className="form-alert" role="alert">
            {listError}
          </p>
        ) : null}

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
                <>
                  {createError ? (
                    <p className="form-alert" role="alert">
                      {createError}
                    </p>
                  ) : null}
                  <NosotrosActivityForm
                    activity={blankActivity}
                    confirmMessage="¿Desea agregar esta actividad?"
                    confirmTitle="Agregar actividad"
                    onCancel={() => {
                      setCreateError(null)
                      close()
                    }}
                    onSave={(values) => handleCreateActivity(values, close)}
                  />
                </>
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
        <TeamGallery
          emptyMessage={content.researchers.emptyMessage}
          hint={content.researchers.hint}
          label={content.researchers.title}
          people={content.researchers.people}
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
          <>
            {saveError ? (
              <p className="form-alert" role="alert">
                {saveError}
              </p>
            ) : null}
            <NosotrosActivityForm
              activity={editingActivity}
              onCancel={closeEditor}
              onSave={handleSaveActivity}
            />
          </>
        ) : null}
      </Modal>
    </article>
  )
}
