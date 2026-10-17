'use client'

import { useRef, useState } from 'react'
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
  type BilingualResearcherFormValues,
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
import type {
  NosotrosCardIcon,
  NosotrosContent,
  NosotrosResearcher,
  NosotrosResearcherCreateBody,
  NosotrosResearcherUpdateBody,
} from '@/app/lib/nosotros'

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

/** The body sent to `/api/nosotros/researchers`: a create, or an update with only what changed. */
type ResearcherRequestBody = NosotrosResearcherCreateBody | NosotrosResearcherUpdateBody

/** The addresses of a researcher as the form shows them, one comma separated string. */
function emailText(email: NosotrosResearcher['email']): string {
  if (!email) return ''
  return typeof email === 'string' ? email : email.join(', ')
}

/**
 * The update body for an edited researcher: the version, the shared fields that changed and, only
 * when the role or the description changed, both languages with the reviews the editor
 * confirmed. `null` when nothing changed.
 */
function researcherUpdateBody(
  person: NosotrosResearcher,
  version: string,
  values: BilingualResearcherFormValues,
): NosotrosResearcherUpdateBody | null {
  const changes: Omit<NosotrosResearcherUpdateBody, 'version'> = {
    ...(values.src === person.src ? {} : { src: values.src }),
    ...(values.name.trim() === person.name ? {} : { name: values.name }),
    ...(values.email === emailText(person.email) ? {} : { email: values.email }),
    ...(values.institution.trim() === person.institution
      ? {}
      : { institution: values.institution }),
    ...(values.content
      ? { content: values.content, confirmedUnchanged: values.confirmedUnchanged }
      : {}),
  }

  return Object.keys(changes).length === 0 ? null : { version, ...changes }
}

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
  const tResearchers = useTranslations('researchers')
  const tNosotrosResearchers = useTranslations('nosotros.researchers')
  const sendWithFeedback = useRequestFeedback()
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  // A second click while a save is in flight would send the same version again and come back as
  // a false conflict.
  const saving = useRef(false)

  const editingActivity = content.activities.items.find((item) => item.id === editingActivityId)
  const editingData = editingActivity?.editing ?? null

  function openEditor(id: string) {
    setEditingActivityId(id)
  }

  function closeEditor() {
    setEditingActivityId(null)
  }

  function jsonRequest(
    method: 'POST' | 'PATCH',
    body: NosotrosActivityFormBody | ResearcherRequestBody,
  ) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  }

  /** Runs one save at a time. The form stays open on failure, so the editor can retry. */
  async function saveOnce(send: () => Promise<boolean>): Promise<boolean> {
    if (saving.current) return false
    saving.current = true
    try {
      return await send()
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

  /** Saves an edited researcher. Resolves to whether it was saved, so the editor can close. */
  async function handleSaveResearcher(
    person: NosotrosResearcher,
    values: BilingualResearcherFormValues,
  ): Promise<boolean> {
    // The editing data comes with the edit permission, which opening this form already required.
    if (!person.editing) return false

    const body = researcherUpdateBody(person, person.editing.version, values)
    // Nothing to save: close instead of sending an empty update.
    if (!body) return true

    return saveOnce(() =>
      sendWithFeedback(`/api/nosotros/researchers/${person.id}`, jsonRequest('PATCH', body), {
        success: tResearchers('updated'),
        fallback: tResearchers('errors.unknown'),
        // Re-runs the server component's `getNosotrosResearchers()` so the page
        // reflects the saved change immediately, without an optimistic guess.
        onSuccess: () => router.refresh(),
      }),
    )
  }

  async function handleCreateResearcher(values: BilingualResearcherFormValues, close: () => void) {
    // A new researcher always carries both languages, since the form starts from nothing.
    if (!values.content) return

    const body: NosotrosResearcherCreateBody = {
      src: values.src,
      name: values.name,
      email: values.email,
      institution: values.institution,
      content: values.content,
    }

    await saveOnce(() =>
      sendWithFeedback('/api/nosotros/researchers', jsonRequest('POST', body), {
        success: tResearchers('created'),
        fallback: tResearchers('errors.unknown'),
        onSuccess: () => {
          close()
          router.refresh()
        },
      }),
    )
  }

  async function handleDeleteResearcher(id: string) {
    await sendWithFeedback(
      `/api/nosotros/researchers/${id}`,
      { method: 'DELETE' },
      {
        success: tResearchers('deleted'),
        fallback: tResearchers('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
      },
    )
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
            <AddItemCard label={t('add')} size="large">
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
        <TeamGallery
          emptyMessage={content.researchers.emptyMessage}
          hint={content.researchers.hint}
          label={content.researchers.title}
          people={content.researchers.people}
          renderPerson={(person) => (
            <EditableResearcherCard
              canDelete={canDelete}
              canEdit={canEdit}
              contentLang={contentLangAttribute(person.contentLocale)}
              onDelete={() => handleDeleteResearcher(person.id)}
              onSave={(values: BilingualResearcherFormValues) =>
                handleSaveResearcher(person, values)
              }
              researcher={person}
              translation={{ editing: person.editing ?? null }}
            />
          )}
          trailingSlide={
            editMode && canCreate ? (
              <AddItemCard label={tNosotrosResearchers('add')}>
                {({ close }) => (
                  <ResearcherForm
                    onCancel={close}
                    onSave={(values: BilingualResearcherFormValues) =>
                      handleCreateResearcher(values, close)
                    }
                    researcher={null}
                    translation={{ editing: null }}
                  />
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
        size="large"
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
