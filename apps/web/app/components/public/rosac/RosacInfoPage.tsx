'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Crosshair,
  GraduationCap,
  Mail,
  MapPin,
  Radio,
  RadioTower,
  Settings,
  Sun,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import type { NosotrosResearcherUpdateBody } from '@/app/lib/nosotros-researcher-schema'
import type {
  RosacAcknowledgment,
  RosacCardIcon,
  RosacInfoContent,
  TeamMember,
} from '@/app/lib/rosac'
import type { ConstructionStage } from '@/app/lib/rosac-construction'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'

import styles from './RosacInfoPage.module.css'
import { AcknowledgmentsGallery } from './AcknowledgmentsGallery'
import { ConstructionCarousel } from './ConstructionCarousel'
import { DonationCard } from './DonationCard'
import { EditableAcknowledgmentCard } from './EditableAcknowledgmentCard'
import { EditableResearcherCard } from './EditableResearcherCard'
import { InstrumentCard } from './InstrumentCard'
import { InstrumentsGallery } from './InstrumentsGallery'
import {
  ResearcherForm,
  type BilingualResearcherFormValues,
  type ResearcherFormHandle,
} from './ResearcherForm'
import {
  RosacAcknowledgmentForm,
  type RosacAcknowledgmentFormHandle,
  type RosacAcknowledgmentFormValues,
} from './RosacAcknowledgmentForm'
import {
  RosacActivityForm,
  type RosacActivityFormBody,
  type RosacActivityFormHandle,
} from './RosacActivityForm'
import {
  RosacCharacteristicForm,
  type RosacCharacteristicFormBody,
  type RosacCharacteristicFormHandle,
} from './RosacCharacteristicForm'
import {
  RosacInstrumentForm,
  type RosacInstrumentFormBody,
  type RosacInstrumentFormHandle,
} from './RosacInstrumentForm'
import { RosacLocationMapLoader } from './RosacLocationMapLoader'
import {
  RosacStageForm,
  type RosacStageFormBody,
  type RosacStageFormHandle,
} from './RosacStageForm'
import { TeamGallery } from './TeamGallery'

const icons: Record<RosacCardIcon, LucideIcon> = {
  antenna: RadioTower,
  location: MapPin,
  frequency: Waves,
  sun: Sun,
  tracking: Crosshair,
  control: Settings,
  receiver: Radio,
  maintenance: Wrench,
  education: GraduationCap,
}

/** The addresses of a researcher as the form shows them, one comma separated string. */
function emailText(email: TeamMember['email']): string {
  if (!email) return ''
  return typeof email === 'string' ? email : email.join(', ')
}

/**
 * The update body for an edited researcher: the version, the shared fields that changed and,
 * only when the role or the description changed, both languages with the reviews the editor
 * confirmed. `null` when nothing changed.
 */
function researcherUpdateBody(
  person: TeamMember,
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

export interface RosacInfoPageProps {
  content: RosacInfoContent
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  onSaveCharacteristic?: (
    id: string,
    values: RosacCharacteristicFormBody,
  ) => Promise<string | null> | void
  onSaveActivity?: (id: string, values: RosacActivityFormBody) => Promise<string | null> | void
  onSaveStage?: (id: string, values: RosacStageFormBody) => Promise<string | null> | void
  onCreateInstrument?: (values: RosacInstrumentFormBody) => Promise<string | null> | void
  onSaveInstrument?: (id: string, values: RosacInstrumentFormBody) => Promise<string | null> | void
  onDeleteInstrument?: (id: string) => Promise<string | null> | void
  onCreateAcknowledgment?: (values: RosacAcknowledgmentFormValues) => Promise<string | null> | void
  onSaveAcknowledgment?: (
    id: string,
    values: RosacAcknowledgmentFormValues,
  ) => Promise<string | null> | void
  onDeleteAcknowledgment?: (id: string) => Promise<string | null> | void
}

export function RosacInfoPage({
  content,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  onSaveCharacteristic,
  onSaveActivity,
  onSaveStage,
  onCreateInstrument,
  onSaveInstrument,
  onDeleteInstrument,
  onCreateAcknowledgment,
  onSaveAcknowledgment,
  onDeleteAcknowledgment,
}: RosacInfoPageProps) {
  const router = useRouter()
  const siteLocale = useLocale()
  const { editMode } = useEditMode()
  const tResearchers = useTranslations('researchers')
  const tEditor = useTranslations('rosac.editor')
  const sendWithFeedback = useRequestFeedback()
  const toast = useToast()
  // Open forms, so the modal's close and Escape ask before discarding their changes.
  const characteristicForm = useRef<RosacCharacteristicFormHandle>(null)
  const activityForm = useRef<RosacActivityFormHandle>(null)
  const stageForm = useRef<RosacStageFormHandle>(null)
  const instrumentForm = useRef<RosacInstrumentFormHandle>(null)
  const createInstrumentForm = useRef<RosacInstrumentFormHandle>(null)
  const createResearcherForm = useRef<ResearcherFormHandle>(null)
  const createAcknowledgmentForm = useRef<RosacAcknowledgmentFormHandle>(null)

  // --- Section 1: Characteristics State (Edit only, fixed 4 cards) ---
  const [characteristics, setCharacteristics] = useState(content.characteristics.items)
  const [editingCharacteristicId, setEditingCharacteristicId] = useState<string | null>(null)

  // --- Section 3: Activities State (Edit only, fixed 3 cards) ---
  const [activities, setActivities] = useState(content.activities.items)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)

  // --- Section 4: Construction Stages State (Edit only, fixed 5 stages) ---
  const [constructionStages, setConstructionStages] = useState(content.construction.stages)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)

  // --- Section 6: Instruments State (Create, Edit, Delete) ---
  const [instruments, setInstruments] = useState(content.instruments.items)
  const [editingInstrumentId, setEditingInstrumentId] = useState<string | null>(null)

  // --- Section 8: Acknowledgments State (Create, Edit, Delete) ---
  const [acknowledgments, setAcknowledgments] = useState<RosacAcknowledgment[]>(() =>
    content.acknowledgments.institutions.map((inst, index) => ({
      id: inst.id ?? `ack-${index}`,
      ...inst,
    })),
  )

  const displayCharacteristics = characteristics
  const displayActivities = activities
  const displayStages = constructionStages
  const displayInstruments = instruments
  const displayAcknowledgments = acknowledgments

  // Synchronize state from content props when updated from server
  useEffect(() => {
    setCharacteristics(content.characteristics.items)
    setActivities(content.activities.items)
    setConstructionStages(content.construction.stages)
    setInstruments(content.instruments.items)
    setAcknowledgments(
      content.acknowledgments.institutions.map((inst, index) => ({
        id: inst.id ?? `ack-${index}`,
        ...inst,
      })),
    )
  }, [
    content.characteristics.items,
    content.activities.items,
    content.construction.stages,
    content.instruments.items,
    content.acknowledgments.institutions,
  ])

  // --- Section 1: Characteristics handlers ---
  const editingCharacteristic = characteristics.find((item) => item.id === editingCharacteristicId)

  function openCharacteristicEditor(id: string) {
    setEditingCharacteristicId(id)
  }

  function closeCharacteristicEditor() {
    setEditingCharacteristicId(null)
  }

  async function handleSaveCharacteristic(values: RosacCharacteristicFormBody) {
    if (!editingCharacteristicId) return

    if (onSaveCharacteristic) {
      const err = await onSaveCharacteristic(editingCharacteristicId, values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/characteristics/${editingCharacteristicId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('characteristics.updated'),
          fallback: tEditor('characteristics.errors.saveUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const title =
      (siteLocale === 'en' ? values.content?.en?.title : undefined) ??
      values.content?.es?.title ??
      values.title
    const description =
      (siteLocale === 'en' ? values.content?.en?.description : undefined) ??
      values.content?.es?.description ??
      values.description

    setCharacteristics((prev) =>
      prev.map((item) =>
        item.id === editingCharacteristicId
          ? {
              ...item,
              ...(values.icon ? { icon: values.icon } : {}),
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(values.content && item.editing
                ? {
                    editing: {
                      ...item.editing,
                      content: {
                        es: values.content.es ?? item.editing.content.es,
                        en:
                          values.content.en !== undefined
                            ? values.content.en
                            : item.editing.content.en,
                      },
                    },
                  }
                : {}),
            }
          : item,
      ),
    )
    closeCharacteristicEditor()
  }

  // --- Section 3: Activities handlers ---
  const editingActivity = activities.find((item) => item.id === editingActivityId)

  function openActivityEditor(id: string) {
    setEditingActivityId(id)
  }

  function closeActivityEditor() {
    setEditingActivityId(null)
  }

  async function handleSaveActivity(values: RosacActivityFormBody) {
    if (!editingActivityId) return

    if (onSaveActivity) {
      const err = await onSaveActivity(editingActivityId, values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/activities/${editingActivityId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('activities.updated'),
          fallback: tEditor('activities.errors.saveUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const title =
      (siteLocale === 'en' ? values.content?.en?.title : undefined) ??
      values.content?.es?.title ??
      values.title
    const description =
      (siteLocale === 'en' ? values.content?.en?.description : undefined) ??
      values.content?.es?.description ??
      values.description

    setActivities((prev) =>
      prev.map((item) =>
        item.id === editingActivityId
          ? {
              ...item,
              ...(values.icon ? { icon: values.icon } : {}),
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(values.content && item.editing
                ? {
                    editing: {
                      ...item.editing,
                      content: {
                        es: values.content.es ?? item.editing.content.es,
                        en:
                          values.content.en !== undefined
                            ? values.content.en
                            : item.editing.content.en,
                      },
                    },
                  }
                : {}),
            }
          : item,
      ),
    )
    closeActivityEditor()
  }

  // --- Section 4: Construction stages handlers ---
  const editingStage = constructionStages.find((s) => s.id === editingStageId)

  function openStageEditor(id: string) {
    setEditingStageId(id)
  }

  function closeStageEditor() {
    setEditingStageId(null)
  }

  async function handleSaveStage(values: RosacStageFormBody) {
    if (!editingStageId) return

    if (onSaveStage) {
      const err = await onSaveStage(editingStageId, values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/stages/${editingStageId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('stages.updated'),
          fallback: tEditor('stages.errors.saveUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const title =
      (siteLocale === 'en' ? values.content?.en?.title : undefined) ??
      values.content?.es?.title ??
      values.title
    const description =
      (siteLocale === 'en' ? values.content?.en?.description : undefined) ??
      values.content?.es?.description ??
      values.description

    setConstructionStages(
      (prev) =>
        prev.map((s) =>
          s.id === editingStageId
            ? ({
                ...s,
                ...(title ? { title, navigationLabel: title } : {}),
                ...(description ? { description } : {}),
                ...(values.images && values.images.length > 0 ? { images: values.images } : {}),
                ...(values.content && s.editing
                  ? {
                      editing: {
                        ...s.editing,
                        content: {
                          es: values.content.es ?? s.editing.content.es,
                          en:
                            values.content.en !== undefined
                              ? values.content.en
                              : s.editing.content.en,
                        },
                      },
                    }
                  : {}),
              } as unknown as ConstructionStage)
            : s,
        ) as unknown as readonly [ConstructionStage, ...ConstructionStage[]],
    )
    closeStageEditor()
  }

  // --- Section 6: Instruments handlers ---
  const editingInstrument = instruments.find((inst) => inst.id === editingInstrumentId)

  function openInstrumentEditor(id: string) {
    setEditingInstrumentId(id)
  }

  function closeInstrumentEditor() {
    setEditingInstrumentId(null)
  }

  async function handleSaveInstrument(values: RosacInstrumentFormBody) {
    if (!editingInstrumentId) return

    if (onSaveInstrument) {
      const err = await onSaveInstrument(editingInstrumentId, values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/instruments/${editingInstrumentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('instruments.updated'),
          fallback: tEditor('instruments.errors.saveUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const name =
      (siteLocale === 'en' ? values.content?.en?.name : undefined) ??
      values.content?.es?.name ??
      values.name
    const description =
      (siteLocale === 'en' ? values.content?.en?.description : undefined) ??
      values.content?.es?.description ??
      values.pendingMessage

    setInstruments((prev) =>
      prev.map((inst) =>
        inst.id === editingInstrumentId
          ? {
              ...inst,
              ...(name ? { name } : {}),
              ...(description !== undefined
                ? {
                    pendingMessage: description || undefined,
                    consultation: inst.consultation
                      ? { ...inst.consultation, notice: description || undefined }
                      : undefined,
                  }
                : {}),
              ...(values.image ? { image: values.image } : {}),
              ...(values.consultation !== undefined
                ? {
                    consultation: values.consultation
                      ? {
                          href: values.consultation.href,
                          label: values.consultation.label,
                          notice: description || inst.consultation?.notice,
                        }
                      : undefined,
                  }
                : {}),
              ...(values.content && inst.editing
                ? {
                    editing: {
                      ...inst.editing,
                      content: {
                        es: values.content.es ?? inst.editing.content.es,
                        en:
                          values.content.en !== undefined
                            ? values.content.en
                            : inst.editing.content.en,
                      },
                    },
                  }
                : {}),
            }
          : inst,
      ),
    )
    closeInstrumentEditor()
  }

  async function handleCreateInstrument(values: RosacInstrumentFormBody, close: () => void) {
    const created: { instrument: Partial<RosacInstrumentCardContent> | null } = { instrument: null }

    if (onCreateInstrument) {
      const err = await onCreateInstrument(values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        '/api/rosac/instruments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('instruments.created'),
          fallback: tEditor('instruments.errors.saveUnknown'),
          onSuccess: async (response) => {
            const data = (await response.json().catch(() => null)) as {
              instrument?: RosacInstrumentCardContent
            } | null
            if (data?.instrument) {
              created.instrument = data.instrument
            }
            router.refresh()
          },
        },
      )
      if (!ok) return
    }

    const name =
      (siteLocale === 'en' ? values.content?.en?.name : undefined) ??
      values.content?.es?.name ??
      values.name ??
      ''
    const description =
      (siteLocale === 'en' ? values.content?.en?.description : undefined) ??
      values.content?.es?.description ??
      values.pendingMessage

    const newInstrument: RosacInstrumentCardContent = {
      id: created.instrument?.id ?? `instrument-${Date.now()}`,
      name: created.instrument?.name ?? name,
      pendingMessage: created.instrument?.pendingMessage ?? description,
      image: created.instrument?.image ?? values.image,
      consultation:
        created.instrument?.consultation ??
        (values.consultation
          ? {
              href: values.consultation.href,
              label: values.consultation.label,
              notice: description,
            }
          : undefined),
    }

    setInstruments((prev) => [newInstrument, ...prev])
    close()
  }

  async function handleDeleteInstrument(id: string) {
    if (onDeleteInstrument) {
      const err = await onDeleteInstrument(id)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/instruments/${id}`,
        { method: 'DELETE' },
        {
          success: tEditor('instruments.deleted'),
          fallback: tEditor('instruments.errors.deleteUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    setInstruments(instruments.filter((inst) => inst.id !== id))
  }

  // --- Section 7: Researcher Handlers ---
  // Reports the outcome in a toast once the request is done, then refreshes the team.
  async function handleSaveResearcher(
    person: TeamMember,
    values: BilingualResearcherFormValues,
  ): Promise<boolean> {
    if (!person.editing) return false
    const body = researcherUpdateBody(person, person.editing.version, values)
    // Nothing to save: close instead of sending an empty update.
    if (!body) return true

    return sendWithFeedback(
      `/api/researchers/${person.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      {
        success: tResearchers('updated'),
        fallback: tResearchers('errors.unknown'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  // Reports the outcome in a toast once the request is done. On success the "Añadir" modal
  // closes and the page refreshes; on failure it stays open with what was typed.
  async function handleCreateResearcher(values: BilingualResearcherFormValues, close: () => void) {
    if (!values.content) return

    await sendWithFeedback(
      '/api/researchers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src: values.src,
          name: values.name,
          email: values.email,
          institution: values.institution,
          content: values.content,
        }),
      },
      {
        success: tResearchers('created'),
        fallback: tResearchers('errors.unknown'),
        onSuccess: () => {
          close()
          router.refresh()
        },
      },
    )
  }

  // Reports the outcome in a toast once the request is done, the same way the save and create
  // handlers above do.
  async function handleDeleteResearcher(id: string) {
    await sendWithFeedback(
      `/api/researchers/${id}`,
      { method: 'DELETE' },
      {
        success: tResearchers('deleted'),
        fallback: tResearchers('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  // --- Section 8: Acknowledgments Handlers ---
  async function handleSaveAcknowledgment(
    id: string,
    values: RosacAcknowledgmentFormValues,
  ): Promise<string | null> {
    if (onSaveAcknowledgment) {
      const err = await onSaveAcknowledgment(id, values)
      if (err) {
        return err
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/acknowledgments/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('acknowledgments.updated'),
          fallback: tEditor('acknowledgments.errors.saveUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return 'Error al guardar la institución'
    }

    const updated = acknowledgments.map((inst) =>
      inst.id === id
        ? {
            ...inst,
            name: values.name,
            href: values.href,
            logo: values.logo,
          }
        : inst,
    )
    setAcknowledgments(updated)
    return null
  }

  async function handleCreateAcknowledgment(
    values: RosacAcknowledgmentFormValues,
    close: () => void,
  ) {
    const created: { acknowledgment: Partial<RosacAcknowledgment> | null } = {
      acknowledgment: null,
    }

    if (onCreateAcknowledgment) {
      const err = await onCreateAcknowledgment(values)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        '/api/rosac/acknowledgments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: tEditor('acknowledgments.created'),
          fallback: tEditor('acknowledgments.errors.saveUnknown'),
          onSuccess: async (response) => {
            const data = (await response.json().catch(() => null)) as {
              acknowledgment?: RosacAcknowledgment
            } | null
            if (data?.acknowledgment) {
              created.acknowledgment = data.acknowledgment
            }
            router.refresh()
          },
        },
      )
      if (!ok) return
    }

    const newInstitution: RosacAcknowledgment = {
      id: created.acknowledgment?.id ?? `ack-${Date.now()}`,
      name: created.acknowledgment?.name ?? values.name,
      href: created.acknowledgment?.href ?? values.href,
      logo: created.acknowledgment?.logo ?? values.logo,
    }

    setAcknowledgments((prev) => [newInstitution, ...prev])
    close()
  }

  async function handleDeleteAcknowledgment(id: string) {
    if (onDeleteAcknowledgment) {
      const err = await onDeleteAcknowledgment(id)
      if (err) {
        toast.show('error', err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/acknowledgments/${id}`,
        { method: 'DELETE' },
        {
          success: tEditor('acknowledgments.deleted'),
          fallback: tEditor('acknowledgments.errors.deleteUnknown'),
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    setAcknowledgments(acknowledgments.filter((inst) => inst.id !== id))
  }

  return (
    <article className="topic-page">
      <TopicHero {...content.hero} />

      <TopicSection title={content.overview.title} titleId="rosac-overview-title" wide>
        {content.overview.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      {/* SECCIÓN 1: Características principales (SOLO EDITAR CONTENIDO, 4 tarjetas fijas) */}
      <TopicSection
        title={content.characteristics.title}
        titleId="rosac-characteristics-title"
        index="1"
      >
        <CardGrid columns={4} equalHeight>
          {displayCharacteristics.map((item) => {
            const Icon = icons[item.icon] ?? RadioTower
            const icon = <Icon size={22} strokeWidth={1.8} />
            const showEditor = editMode && canEdit

            if (!showEditor) {
              return (
                <InfoCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={icon}
                />
              )
            }

            return (
              <EditableWrapper
                key={item.id}
                editLabel={tEditor('characteristics.editLabel', { title: item.title })}
                onEdit={() => openCharacteristicEditor(item.id)}
              >
                <InfoCard title={item.title} description={item.description} icon={icon} />
              </EditableWrapper>
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection
        index="2"
        intro={content.location.intro}
        title={content.location.title}
        titleId="rosac-location-title"
      >
        <RosacLocationMapLoader labels={content.location.labels} location={content.location} />
      </TopicSection>

      {/* SECCIÓN 3: Actividades científicas (SOLO EDITAR CONTENIDO, 3 tarjetas fijas) */}
      <TopicSection title={content.activities.title} titleId="rosac-activities-title" index="3">
        <CardGrid columns={3} equalHeight>
          {displayActivities.map((item) => {
            const Icon = icons[item.icon] ?? RadioTower
            const icon = <Icon size={22} strokeWidth={1.8} />
            const showEditor = editMode && canEdit

            if (!showEditor) {
              return (
                <InfoCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={icon}
                />
              )
            }

            return (
              <EditableWrapper
                key={item.id}
                editLabel={tEditor('activities.editLabel', { title: item.title })}
                onEdit={() => openActivityEditor(item.id)}
              >
                <InfoCard title={item.title} description={item.description} icon={icon} />
              </EditableWrapper>
            )
          })}
        </CardGrid>
      </TopicSection>

      {/* SECCIÓN 4: Construcción y desarrollo (SOLO EDITAR CONTENIDO, 5 etapas fijas) */}
      <TopicSection
        id="construccion"
        title={content.construction.title}
        titleId="rosac-construction-title"
        intro={content.construction.intro}
        index="4"
        wide
      >
        <ConstructionCarousel
          canEdit={editMode && canEdit}
          carousel={content.construction.carousel}
          onEditStage={(stage) => openStageEditor(stage.id)}
          stages={displayStages}
        />
      </TopicSection>

      <TopicSection
        title={content.radioObservation.title}
        titleId="rosac-radio-observation-title"
        index="5"
        className={styles.radioObservationSection}
        wide
      >
        {content.radioObservation.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection
        title={content.relationship.title}
        titleId="rosac-relationship-title"
        className={styles.relationshipSection}
        featured
      >
        {content.relationship.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      {/* SECCIÓN 6: Instrumentos científicos (CREAR, EDITAR Y ELIMINAR) */}
      <TopicSection
        id="instrumentos"
        index="6"
        title={content.instruments.title}
        titleId="rosac-instruments-title"
        intro={content.instruments.intro}
        className={styles.instrumentsSection}
        wide
      >
        {instruments.length > 3 || (editMode && canCreate) ? (
          <InstrumentsGallery
            label={content.instruments.title}
            leadingSlide={
              editMode && canCreate ? (
                <AddItemCard
                  label={tEditor('instruments.addCard')}
                  onRequestClose={(close) => {
                    if (createInstrumentForm.current) createInstrumentForm.current.requestCancel()
                    else close()
                  }}
                >
                  {({ close }) => (
                    <RosacInstrumentForm
                      instrument={null}
                      onCancel={close}
                      onSave={(values) => handleCreateInstrument(values, close)}
                      ref={createInstrumentForm}
                    />
                  )}
                </AddItemCard>
              ) : undefined
            }
          >
            {displayInstruments.map((instrument) => {
              const showEditor = editMode && (canEdit || canDelete)

              if (!showEditor) {
                return <InstrumentCard key={instrument.id} instrument={instrument} />
              }

              return (
                <EditableWrapper
                  key={instrument.id}
                  deleteConfirmMessage={tEditor('instruments.deleteConfirmMessage')}
                  deleteConfirmTitle={tEditor('instruments.deleteConfirmTitle')}
                  deleteLabel={tEditor('instruments.deleteLabel', { name: instrument.name })}
                  editLabel={tEditor('instruments.editLabel', { name: instrument.name })}
                  onDelete={canDelete ? () => handleDeleteInstrument(instrument.id) : undefined}
                  onEdit={canEdit ? () => openInstrumentEditor(instrument.id) : undefined}
                >
                  <InstrumentCard instrument={instrument} />
                </EditableWrapper>
              )
            })}
          </InstrumentsGallery>
        ) : (
          <CardGrid columns={3} equalHeight>
            {displayInstruments.map((instrument) => {
              const showEditor = editMode && (canEdit || canDelete)

              if (!showEditor) {
                return <InstrumentCard key={instrument.id} instrument={instrument} />
              }

              return (
                <EditableWrapper
                  key={instrument.id}
                  deleteConfirmMessage={tEditor('instruments.deleteConfirmMessage')}
                  deleteConfirmTitle={tEditor('instruments.deleteConfirmTitle')}
                  deleteLabel={tEditor('instruments.deleteLabel', { name: instrument.name })}
                  editLabel={tEditor('instruments.editLabel', { name: instrument.name })}
                  onDelete={canDelete ? () => handleDeleteInstrument(instrument.id) : undefined}
                  onEdit={canEdit ? () => openInstrumentEditor(instrument.id) : undefined}
                >
                  <InstrumentCard instrument={instrument} />
                </EditableWrapper>
              )
            })}
          </CardGrid>
        )}
      </TopicSection>

      {/* SECCIÓN 7: Investigadores (Preservada sin modificaciones) */}
      <TopicSection
        id="investigadores"
        index="7"
        intro={content.team.intro}
        title={content.team.title}
        titleId="rosac-team-title"
        wide
      >
        <TeamGallery
          emptyMessage={content.team.emptyMessage}
          hint={content.team.hint}
          institutionLabel={content.team.institutionLabel}
          label={content.team.title}
          people={content.team.people}
          renderPerson={(person) => (
            <EditableResearcherCard
              canDelete={canDelete}
              canEdit={canEdit}
              contentLang={person.contentLang}
              institutionLabel={content.team.institutionLabel}
              onDelete={() => handleDeleteResearcher(person.id)}
              onSave={(values: BilingualResearcherFormValues) =>
                handleSaveResearcher(person, values)
              }
              researcher={person}
              translation={{ editing: person.editing ?? null }}
            />
          )}
          leadingSlide={
            editMode && canCreate ? (
              <AddItemCard
                label={tResearchers('editor.addCard')}
                onRequestClose={(close) => {
                  if (createResearcherForm.current) createResearcherForm.current.requestCancel()
                  else close()
                }}
              >
                {({ close }) => (
                  <ResearcherForm
                    onCancel={close}
                    onSave={(values: BilingualResearcherFormValues) =>
                      handleCreateResearcher(values, close)
                    }
                    ref={createResearcherForm}
                    researcher={null}
                    translation={{ editing: null }}
                    uploadPolicy="rosac"
                  />
                )}
              </AddItemCard>
            ) : undefined
          }
        />
      </TopicSection>

      <TopicSection
        id="donaciones"
        index="8"
        intro={content.donations.subtitle}
        title={content.donations.title}
        titleId="rosac-donations-title"
        wide
      >
        <div className={`news-list ${styles.donationsList}`}>
          {content.donations.items.map((donation) => (
            <DonationCard donation={donation} key={donation.title} />
          ))}
        </div>

        <div className={`topic-highlight ${styles.ctaBox}`}>
          <div className={styles.ctaText}>
            <h3>{content.donations.cta.title}</h3>
            <p>{content.donations.cta.description}</p>
          </div>
          <Button
            href={content.donations.cta.href}
            icon={<Mail aria-hidden="true" size={18} strokeWidth={1.8} />}
            variant="primary"
          >
            {content.donations.cta.buttonLabel}
          </Button>
        </div>
      </TopicSection>

      <TopicSection
        id="agradecimientos"
        index="9"
        intro={content.acknowledgments.subtitle}
        title={content.acknowledgments.title}
        titleId="rosac-acknowledgments-title"
        wide
      >
        <AcknowledgmentsGallery
          institutions={displayAcknowledgments}
          label={content.acknowledgments.title}
          renderInstitution={(institution) => (
            <EditableAcknowledgmentCard
              canDelete={canDelete}
              canEdit={canEdit}
              institution={institution}
              onDelete={() => handleDeleteAcknowledgment(institution.id!)}
              onSave={(values) => handleSaveAcknowledgment(institution.id!, values)}
            />
          )}
          leadingSlide={
            editMode && canCreate ? (
              <AddItemCard
                label={tEditor('acknowledgments.addCard')}
                onRequestClose={(close) => {
                  if (createAcknowledgmentForm.current) {
                    createAcknowledgmentForm.current.requestCancel()
                  } else close()
                }}
              >
                {({ close }) => (
                  <RosacAcknowledgmentForm
                    institution={null}
                    onCancel={close}
                    onSave={(values) => handleCreateAcknowledgment(values, close)}
                    ref={createAcknowledgmentForm}
                  />
                )}
              </AddItemCard>
            ) : undefined
          }
        />
      </TopicSection>
      <div className={`topic-page-footer page-width ${styles.pageFooter}`}>
        <TopicBackLink {...content.backLink} />
      </div>

      {/* Edit modal for Section 1: Characteristics */}
      <Modal
        onClose={() => {
          if (characteristicForm.current) characteristicForm.current.requestCancel()
          else closeCharacteristicEditor()
        }}
        open={editingCharacteristic !== undefined}
        title={
          editingCharacteristic
            ? tEditor('characteristics.editModalTitle', { title: editingCharacteristic.title })
            : tEditor('characteristics.defaultModalTitle')
        }
      >
        {editingCharacteristic ? (
          <RosacCharacteristicForm
            characteristic={editingCharacteristic}
            onCancel={closeCharacteristicEditor}
            onSave={handleSaveCharacteristic}
            ref={characteristicForm}
          />
        ) : null}
      </Modal>

      {/* Edit modal for Section 3: Activities */}
      <Modal
        onClose={() => {
          if (activityForm.current) activityForm.current.requestCancel()
          else closeActivityEditor()
        }}
        open={editingActivity !== undefined}
        title={
          editingActivity
            ? tEditor('activities.editModalTitle', { title: editingActivity.title })
            : tEditor('activities.defaultModalTitle')
        }
      >
        {editingActivity ? (
          <RosacActivityForm
            activity={editingActivity}
            onCancel={closeActivityEditor}
            onSave={handleSaveActivity}
            ref={activityForm}
          />
        ) : null}
      </Modal>

      {/* Edit modal for Section 4: Construction stages */}
      <Modal
        onClose={() => {
          if (stageForm.current) stageForm.current.requestCancel()
          else closeStageEditor()
        }}
        open={editingStage !== undefined}
        title={
          editingStage
            ? tEditor('stages.editModalTitle', { title: editingStage.title })
            : tEditor('stages.defaultModalTitle')
        }
      >
        {editingStage ? (
          <RosacStageForm
            onCancel={closeStageEditor}
            onSave={handleSaveStage}
            ref={stageForm}
            stage={editingStage}
          />
        ) : null}
      </Modal>

      {/* Edit modal for Section 6: Instruments */}
      <Modal
        onClose={() => {
          if (instrumentForm.current) instrumentForm.current.requestCancel()
          else closeInstrumentEditor()
        }}
        open={editingInstrument !== undefined}
        size="large"
        title={
          editingInstrument
            ? tEditor('instruments.editModalTitle', { name: editingInstrument.name })
            : tEditor('instruments.defaultModalTitle')
        }
      >
        {editingInstrument ? (
          <RosacInstrumentForm
            instrument={editingInstrument}
            onCancel={closeInstrumentEditor}
            onSave={handleSaveInstrument}
            ref={instrumentForm}
          />
        ) : null}
      </Modal>
    </article>
  )
}
