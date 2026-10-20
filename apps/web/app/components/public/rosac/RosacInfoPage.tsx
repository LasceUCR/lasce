'use client'

import { useEffect, useState } from 'react'
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
import { useTranslations } from 'next-intl'

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
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import type { RosacAcknowledgment, RosacCardIcon, RosacInfoContent } from '@/app/lib/rosac'
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
import { ResearcherForm, type ResearcherFormValues } from './ResearcherForm'
import {
  RosacAcknowledgmentForm,
  type RosacAcknowledgmentFormValues,
} from './RosacAcknowledgmentForm'
import { RosacActivityForm, type RosacActivityFormValues } from './RosacActivityForm'
import {
  RosacCharacteristicForm,
  type RosacCharacteristicFormValues,
} from './RosacCharacteristicForm'
import { RosacInstrumentForm, type RosacInstrumentFormValues } from './RosacInstrumentForm'
import { RosacLocationMapLoader } from './RosacLocationMapLoader'
import { RosacStageForm, type RosacStageFormValues } from './RosacStageForm'
import { TeamGallery } from './TeamGallery'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

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

export interface RosacInfoPageProps {
  content: RosacInfoContent
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  onSaveCharacteristic?: (
    id: string,
    values: RosacCharacteristicFormValues,
  ) => Promise<string | null> | void
  onSaveActivity?: (id: string, values: RosacActivityFormValues) => Promise<string | null> | void
  onSaveStage?: (id: string, values: RosacStageFormValues) => Promise<string | null> | void
  onCreateInstrument?: (values: RosacInstrumentFormValues) => Promise<string | null> | void
  onSaveInstrument?: (
    id: string,
    values: RosacInstrumentFormValues,
  ) => Promise<string | null> | void
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
  const { editMode } = useEditMode()
  const tResearchers = useTranslations('researchers')
  const sendWithFeedback = useRequestFeedback()

  // --- Section 1: Characteristics State (Edit only, fixed 4 cards) ---
  const [characteristics, setCharacteristics] = useState(content.characteristics.items)
  const [editingCharacteristicId, setEditingCharacteristicId] = useState<string | null>(null)
  const [characteristicSaveError, setCharacteristicSaveError] = useState<string | null>(null)

  // --- Section 3: Activities State (Edit only, fixed 3 cards) ---
  const [activities, setActivities] = useState(content.activities.items)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [activitySaveError, setActivitySaveError] = useState<string | null>(null)

  // --- Section 4: Construction Stages State (Edit only, fixed 5 stages) ---
  const [constructionStages, setConstructionStages] = useState(content.construction.stages)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [stageSaveError, setStageSaveError] = useState<string | null>(null)

  // --- Section 6: Instruments State (Create, Edit, Delete) ---
  const [instruments, setInstruments] = useState(content.instruments.items)
  const [editingInstrumentId, setEditingInstrumentId] = useState<string | null>(null)
  const [instrumentSaveError, setInstrumentSaveError] = useState<string | null>(null)
  const [instrumentCreateError, setInstrumentCreateError] = useState<string | null>(null)
  const [instrumentListError, setInstrumentListError] = useState<string | null>(null)

  // --- Section 7: Researchers State ---
  const [listError, setListError] = useState<string | null>(null)

  // --- Section 8: Acknowledgments State (Create, Edit, Delete) ---
  const [acknowledgments, setAcknowledgments] = useState<RosacAcknowledgment[]>(() =>
    content.acknowledgments.institutions.map((inst, index) => ({
      id: inst.id ?? `ack-${index}`,
      ...inst,
    })),
  )
  const [acknowledgmentCreateError, setAcknowledgmentCreateError] = useState<string | null>(null)
  const [acknowledgmentListError, setAcknowledgmentListError] = useState<string | null>(null)

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
    setCharacteristicSaveError(null)
    setEditingCharacteristicId(id)
  }

  function closeCharacteristicEditor() {
    setCharacteristicSaveError(null)
    setEditingCharacteristicId(null)
  }

  async function handleSaveCharacteristic(values: RosacCharacteristicFormValues) {
    if (!editingCharacteristicId) return

    if (onSaveCharacteristic) {
      const err = await onSaveCharacteristic(editingCharacteristicId, values)
      if (err) {
        setCharacteristicSaveError(err)
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
          success: 'Característica actualizada correctamente.',
          fallback: 'No se pudo guardar la característica. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const updated = characteristics.map((item) =>
      item.id === editingCharacteristicId
        ? {
            ...item,
            icon: values.icon,
            title: values.title,
            description: values.description,
          }
        : item,
    )
    setCharacteristics(updated)
    closeCharacteristicEditor()
  }

  // --- Section 3: Activities handlers ---
  const editingActivity = activities.find((item) => item.id === editingActivityId)

  function openActivityEditor(id: string) {
    setActivitySaveError(null)
    setEditingActivityId(id)
  }

  function closeActivityEditor() {
    setActivitySaveError(null)
    setEditingActivityId(null)
  }

  async function handleSaveActivity(values: RosacActivityFormValues) {
    if (!editingActivityId) return

    if (onSaveActivity) {
      const err = await onSaveActivity(editingActivityId, values)
      if (err) {
        setActivitySaveError(err)
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
          success: 'Actividad actualizada correctamente.',
          fallback: 'No se pudo guardar la actividad. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const updated = activities.map((item) =>
      item.id === editingActivityId
        ? {
            ...item,
            icon: values.icon,
            title: values.title,
            description: values.description,
          }
        : item,
    )
    setActivities(updated)
    closeActivityEditor()
  }

  // --- Section 4: Construction stages handlers ---
  const editingStage = constructionStages.find((s) => s.id === editingStageId)

  function openStageEditor(id: string) {
    setStageSaveError(null)
    setEditingStageId(id)
  }

  function closeStageEditor() {
    setStageSaveError(null)
    setEditingStageId(null)
  }

  async function handleSaveStage(values: RosacStageFormValues) {
    if (!editingStageId) return

    if (onSaveStage) {
      const err = await onSaveStage(editingStageId, values)
      if (err) {
        setStageSaveError(err)
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
          success: 'Etapa actualizada correctamente.',
          fallback: 'No se pudo guardar la etapa. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const updated = constructionStages.map((s) =>
      s.id === editingStageId
        ? ({
            ...s,
            title: values.title,
            description: values.description,
            images:
              values.images && values.images.length > 0
                ? (values.images as unknown as typeof s.images)
                : s.images,
          } as ConstructionStage)
        : s,
    )
    setConstructionStages(updated as unknown as typeof constructionStages)
    closeStageEditor()
  }

  // --- Section 6: Instruments handlers ---
  const editingInstrument = instruments.find((inst) => inst.id === editingInstrumentId)

  function openInstrumentEditor(id: string) {
    setInstrumentSaveError(null)
    setEditingInstrumentId(id)
  }

  function closeInstrumentEditor() {
    setInstrumentSaveError(null)
    setEditingInstrumentId(null)
  }

  async function handleSaveInstrument(values: RosacInstrumentFormValues) {
    if (!editingInstrumentId) return

    if (onSaveInstrument) {
      const err = await onSaveInstrument(editingInstrumentId, values)
      if (err) {
        setInstrumentSaveError(err)
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
          success: 'Instrumento actualizado correctamente.',
          fallback: 'No se pudo guardar el instrumento. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const updated = instruments.map((inst) =>
      inst.id === editingInstrumentId
        ? {
            ...inst,
            name: values.name,
            pendingMessage: undefined,
            image: values.image ?? inst.image,
            consultation: values.consultation ?? inst.consultation,
          }
        : inst,
    )
    setInstruments(updated)
    closeInstrumentEditor()
  }

  async function handleCreateInstrument(values: RosacInstrumentFormValues, close: () => void) {
    setInstrumentCreateError(null)

    const createdId = `instrument-${Date.now()}`
    if (onCreateInstrument) {
      const err = await onCreateInstrument(values)
      if (err) {
        setInstrumentCreateError(err)
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
          success: 'Instrumento agregado correctamente.',
          fallback: 'No se pudo guardar el instrumento. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const newInstrument: RosacInstrumentCardContent = {
      id: createdId,
      name: values.name,
      pendingMessage: values.pendingMessage,
      image: values.image,
      consultation: values.consultation,
    }

    setInstruments([...instruments, newInstrument])
    close()
  }

  async function handleDeleteInstrument(id: string) {
    setInstrumentListError(null)

    if (onDeleteInstrument) {
      const err = await onDeleteInstrument(id)
      if (err) {
        setInstrumentListError(err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/instruments/${id}`,
        { method: 'DELETE' },
        {
          success: 'Instrumento eliminado correctamente.',
          fallback: 'No se pudo eliminar el instrumento. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    setInstruments(instruments.filter((inst) => inst.id !== id))
  }

  // --- Section 7: Researcher Handlers ---
  // Reports the outcome in a toast once the request is done, then refreshes the team.
  async function handleSaveResearcher(id: string, values: ResearcherFormValues): Promise<boolean> {
    return sendWithFeedback(
      `/api/researchers/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
  async function handleCreateResearcher(values: ResearcherFormValues, close: () => void) {
    await sendWithFeedback(
      '/api/researchers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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

  async function handleDeleteResearcher(id: string) {
    setListError(null)

    let response: Response
    try {
      response = await fetch(`/api/researchers/${id}`, { method: 'DELETE' })
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
          success: 'Institución actualizada correctamente.',
          fallback: 'No se pudo guardar la institución. Inténtelo de nuevo.',
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
    setAcknowledgmentCreateError(null)

    const createdId = `ack-${Date.now()}`
    if (onCreateAcknowledgment) {
      const err = await onCreateAcknowledgment(values)
      if (err) {
        setAcknowledgmentCreateError(err)
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
          success: 'Institución agregada correctamente.',
          fallback: 'No se pudo guardar la institución. Inténtelo de nuevo.',
          onSuccess: () => router.refresh(),
        },
      )
      if (!ok) return
    }

    const newInstitution: RosacAcknowledgment = {
      id: createdId,
      name: values.name,
      logo: values.logo,
    }

    setAcknowledgments([...acknowledgments, newInstitution])
    close()
  }

  async function handleDeleteAcknowledgment(id: string) {
    setAcknowledgmentListError(null)

    if (onDeleteAcknowledgment) {
      const err = await onDeleteAcknowledgment(id)
      if (err) {
        setAcknowledgmentListError(err)
        return
      }
    } else {
      const ok = await sendWithFeedback(
        `/api/rosac/acknowledgments/${id}`,
        { method: 'DELETE' },
        {
          success: 'Institución eliminada correctamente.',
          fallback: 'No se pudo eliminar la institución. Inténtelo de nuevo.',
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
            const Icon = icons[item.icon]
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
                editLabel={`Editar ${item.title}`}
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
            const Icon = icons[item.icon]
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
                editLabel={`Editar ${item.title}`}
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
        {instrumentListError ? (
          <p className="form-alert" role="alert">
            {instrumentListError}
          </p>
        ) : null}

        {instruments.length > 3 || (editMode && canCreate) ? (
          <InstrumentsGallery
            label={content.instruments.title}
            trailingSlide={
              editMode && canCreate ? (
                <AddItemCard label="Añadir instrumento">
                  {({ close }) => (
                    <>
                      {instrumentCreateError ? (
                        <p className="form-alert" role="alert">
                          {instrumentCreateError}
                        </p>
                      ) : null}
                      <RosacInstrumentForm
                        instrument={null}
                        onCancel={() => {
                          setInstrumentCreateError(null)
                          close()
                        }}
                        onSave={(values) => handleCreateInstrument(values, close)}
                      />
                    </>
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
                  deleteConfirmMessage="Esta acción no se puede deshacer y borrará el instrumento científico."
                  deleteConfirmTitle="Eliminar instrumento"
                  deleteLabel={`Eliminar ${instrument.name}`}
                  editLabel={`Editar ${instrument.name}`}
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
                  deleteConfirmMessage="Esta acción no se puede deshacer y borrará el instrumento científico."
                  deleteConfirmTitle="Eliminar instrumento"
                  deleteLabel={`Eliminar ${instrument.name}`}
                  editLabel={`Editar ${instrument.name}`}
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
        {listError ? (
          <p className="form-alert" role="alert">
            {listError}
          </p>
        ) : null}

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
              institutionLabel={content.team.institutionLabel}
              onDelete={() => handleDeleteResearcher(person.id)}
              onSave={(values) => handleSaveResearcher(person.id, values)}
              researcher={person}
            />
          )}
          trailingSlide={
            editMode && canCreate ? (
              <AddItemCard label="Añadir investigador">
                {({ close }) => (
                  <ResearcherForm
                    onCancel={close}
                    onSave={(values) => handleCreateResearcher(values, close)}
                    researcher={null}
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
        {acknowledgmentListError ? (
          <p className="form-alert" role="alert">
            {acknowledgmentListError}
          </p>
        ) : null}

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
          trailingSlide={
            editMode && canCreate ? (
              <AddItemCard label="Añadir institución">
                {({ close }) => (
                  <>
                    {acknowledgmentCreateError ? (
                      <p className="form-alert" role="alert">
                        {acknowledgmentCreateError}
                      </p>
                    ) : null}
                    <RosacAcknowledgmentForm
                      institution={null}
                      onCancel={() => {
                        setAcknowledgmentCreateError(null)
                        close()
                      }}
                      onSave={(values) => handleCreateAcknowledgment(values, close)}
                    />
                  </>
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
        onClose={closeCharacteristicEditor}
        open={editingCharacteristic !== undefined}
        title={
          editingCharacteristic
            ? `Editar "${editingCharacteristic.title}"`
            : 'Editar característica'
        }
      >
        {editingCharacteristic ? (
          <>
            {characteristicSaveError ? (
              <p className="form-alert" role="alert">
                {characteristicSaveError}
              </p>
            ) : null}
            <RosacCharacteristicForm
              characteristic={editingCharacteristic}
              onCancel={closeCharacteristicEditor}
              onSave={handleSaveCharacteristic}
            />
          </>
        ) : null}
      </Modal>

      {/* Edit modal for Section 3: Activities */}
      <Modal
        onClose={closeActivityEditor}
        open={editingActivity !== undefined}
        title={editingActivity ? `Editar "${editingActivity.title}"` : 'Editar actividad'}
      >
        {editingActivity ? (
          <>
            {activitySaveError ? (
              <p className="form-alert" role="alert">
                {activitySaveError}
              </p>
            ) : null}
            <RosacActivityForm
              activity={editingActivity}
              onCancel={closeActivityEditor}
              onSave={handleSaveActivity}
            />
          </>
        ) : null}
      </Modal>

      {/* Edit modal for Section 4: Construction stages */}
      <Modal
        onClose={closeStageEditor}
        open={editingStage !== undefined}
        title={editingStage ? `Editar "${editingStage.title}"` : 'Editar etapa'}
      >
        {editingStage ? (
          <>
            {stageSaveError ? (
              <p className="form-alert" role="alert">
                {stageSaveError}
              </p>
            ) : null}
            <RosacStageForm
              onCancel={closeStageEditor}
              onSave={handleSaveStage}
              stage={editingStage}
            />
          </>
        ) : null}
      </Modal>

      {/* Edit modal for Section 6: Instruments */}
      <Modal
        onClose={closeInstrumentEditor}
        open={editingInstrument !== undefined}
        size="large"
        title={editingInstrument ? `Editar "${editingInstrument.name}"` : 'Editar instrumento'}
      >
        {editingInstrument ? (
          <>
            {instrumentSaveError ? (
              <p className="form-alert" role="alert">
                {instrumentSaveError}
              </p>
            ) : null}
            <RosacInstrumentForm
              instrument={editingInstrument}
              onCancel={closeInstrumentEditor}
              onSave={handleSaveInstrument}
            />
          </>
        ) : null}
      </Modal>
    </article>
  )
}
