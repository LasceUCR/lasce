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
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import type { NosotrosCardIcon, NosotrosContent } from '@/app/lib/nosotros'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { NosotrosActivityForm, type NosotrosActivityFormBody } from './NosotrosActivityForm'

const icons: Record<NosotrosCardIcon, LucideIcon> = {
  sun: Sun,
  waves: Waves,
  satellite: Satellite,
  code: Code,
  collaboration: Users,
  education: GraduationCap,
}

/** Starting point for a brand-new card — the form just needs some valid icon selected. */
const blankIcon: NosotrosCardIcon = 'sun'

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
  const tResearchers = useTranslations('nosotros.researchers')
  const saveErrorMessage = tResearchers('saveError')
  const sendWithFeedback = useRequestFeedback()
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  // A second click while a save is in flight would send the same version again and come back as
  // a false conflict.
  const saving = useRef(false)
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
  const editingData = editingActivity?.editing ?? null

  function openEditor(id: string) {
    setEditingActivityId(id)
  }

  function closeEditor() {
    setEditingActivityId(null)
  }

  function jsonRequest(method: 'POST' | 'PATCH', body: NosotrosActivityFormBody) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  }

  /** Runs one save at a time. The form stays open on failure, so the editor can retry. */
  async function saveOnce(send: () => Promise<boolean>) {
    if (saving.current) return
    saving.current = true
    try {
      await send()
    } finally {
      saving.current = false
    }
  }

  async function handleSaveActivity(body: NosotrosActivityFormBody) {
    if (!editingActivityId) return

    await saveOnce(() =>
      sendWithFeedback(
        `/api/nosotros/activities/${editingActivityId}`,
        jsonRequest('PATCH', body),
        {
          success: t('updated'),
          fallback: t('errors.unknown'),
          onSuccess: () => {
            closeEditor()
            // Re-runs the server component's `getNosotrosActivities()` so the page
            // reflects the saved change immediately, without an optimistic guess.
            router.refresh()
          },
        },
      ),
    )
  }

  async function handleCreateActivity(body: NosotrosActivityFormBody, close: () => void) {
    await saveOnce(() =>
      sendWithFeedback('/api/nosotros/activities', jsonRequest('POST', body), {
        success: t('created'),
        fallback: t('errors.unknown'),
        onSuccess: () => {
          close()
          router.refresh()
        },
      }),
    )
  }

  async function handleDeleteActivity(id: string) {
    await sendWithFeedback(
      `/api/nosotros/activities/${id}`,
      { method: 'DELETE' },
      {
        success: t('deleted'),
        fallback: t('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
      },
    )
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
      return saveErrorMessage
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      return body?.error ?? saveErrorMessage
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
      setResearcherCreateError(saveErrorMessage)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setResearcherCreateError(body?.error ?? saveErrorMessage)
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
      setResearcherListError(saveErrorMessage)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setResearcherListError(body?.error ?? saveErrorMessage)
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
          <p className="topic-intro">{t('emptyHint')}</p>
        ) : null}

        <CardGrid columns={3} equalHeight>
          {content.activities.items.map((item) => {
            const Icon = icons[item.icon]
            const icon = <Icon size={22} strokeWidth={1.8} />
            const lang = contentLangAttribute(item.contentLocale)
            // The editor needs both languages and the version, which only an editor receives.
            const editable = canEdit && item.editing !== undefined
            const showEditor = editMode && (editable || canDelete)

            if (!showEditor) {
              return (
                <InfoCard
                  key={item.id}
                  description={item.description}
                  icon={icon}
                  lang={lang}
                  title={item.title}
                />
              )
            }

            return (
              <EditableWrapper
                key={item.id}
                deleteConfirmLabel={t('deleteConfirm')}
                deleteConfirmMessage={t('deleteMessage', { title: item.title })}
                deleteConfirmTitle={t('deleteTitle')}
                deleteLabel={t('deleteLabel', { title: item.title })}
                editLabel={t('editLabel', { title: item.title })}
                onDelete={canDelete ? () => handleDeleteActivity(item.id) : undefined}
                onEdit={editable ? () => openEditor(item.id) : undefined}
              >
                <InfoCard
                  description={item.description}
                  icon={icon}
                  lang={lang}
                  title={item.title}
                />
              </EditableWrapper>
            )
          })}

          {editMode && canCreate ? (
            <AddItemCard label={t('add')}>
              {({ close }) => (
                <NosotrosActivityForm
                  editing={null}
                  icon={blankIcon}
                  onCancel={close}
                  onSave={(body) => handleCreateActivity(body, close)}
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
              <AddItemCard label={tResearchers('add')}>
                {({ close }) => (
                  <>
                    {researcherCreateError ? (
                      <p className="form-alert" ref={researcherCreateErrorRef} role="alert">
                        {researcherCreateError}
                      </p>
                    ) : null}
                    <ResearcherForm
                      confirmMessage={tResearchers('createConfirmMessage')}
                      confirmTitle={tResearchers('createConfirmTitle')}
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
        open={editingActivity !== undefined && editingData !== null}
        title={
          editingActivity ? t('editTitle', { title: editingActivity.title }) : t('editFallback')
        }
      >
        {editingActivity && editingData ? (
          <NosotrosActivityForm
            editing={editingData}
            icon={editingActivity.icon}
            onCancel={closeEditor}
            onSave={handleSaveActivity}
          />
        ) : null}
      </Modal>
    </article>
  )
}
