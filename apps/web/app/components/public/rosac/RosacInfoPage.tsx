'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChartNoAxesCombined,
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
import type { RosacAcknowledgment, RosacCardIcon, RosacInfoContent } from '@/app/lib/rosac'
import type { ConstructionStage } from '@/app/lib/rosac-construction'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

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

const ROSAC_STORAGE_KEYS = {
  characteristics: 'lasce_rosac_characteristics_v1',
  activities: 'lasce_rosac_activities_v1',
  stages: 'lasce_rosac_stages_v1',
  instruments: 'lasce_rosac_instruments_v1',
  acknowledgments: 'lasce_rosac_acknowledgments_v1',
} as const

function saveToLocalStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
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

  // --- Section 7: Researchers State (Existing logic preserved) ---
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const createErrorRef = useRef<HTMLParagraphElement>(null)

  // --- Section 8: Acknowledgments State (Create, Edit, Delete) ---
  const [acknowledgments, setAcknowledgments] = useState<RosacAcknowledgment[]>(() =>
    content.acknowledgments.institutions.map((inst, index) => ({
      id: inst.id ?? `ack-${index}`,
      ...inst,
    })),
  )
  const [acknowledgmentCreateError, setAcknowledgmentCreateError] = useState<string | null>(null)
  const [acknowledgmentListError, setAcknowledgmentListError] = useState<string | null>(null)

  // Restore persisted state on mount from localStorage if available
  useEffect(() => {
    try {
      const storedInstruments = localStorage.getItem(ROSAC_STORAGE_KEYS.instruments)
      if (storedInstruments) {
        const parsed = JSON.parse(storedInstruments)
        if (Array.isArray(parsed)) setInstruments(parsed)
      }
      const storedCharacteristics = localStorage.getItem(ROSAC_STORAGE_KEYS.characteristics)
      if (storedCharacteristics) {
        const parsed = JSON.parse(storedCharacteristics)
        if (Array.isArray(parsed)) setCharacteristics(parsed)
      }
      const storedActivities = localStorage.getItem(ROSAC_STORAGE_KEYS.activities)
      if (storedActivities) {
        const parsed = JSON.parse(storedActivities)
        if (Array.isArray(parsed)) setActivities(parsed)
      }
      const storedStages = localStorage.getItem(ROSAC_STORAGE_KEYS.stages)
      if (storedStages) {
        const parsed = JSON.parse(storedStages)
        if (Array.isArray(parsed)) {
          setConstructionStages(parsed as unknown as typeof content.construction.stages)
        }
      }
      const storedAcknowledgments = localStorage.getItem(ROSAC_STORAGE_KEYS.acknowledgments)
      if (storedAcknowledgments) {
        const parsed = JSON.parse(storedAcknowledgments)
        if (Array.isArray(parsed)) setAcknowledgments(parsed)
      }
    } catch {
      // ignore storage errors
    }
  }, [content.construction.stages])

  // Scrolls the "Añadir investigador" error into view as soon as it appears
  useEffect(() => {
    if (createError) {
      scrollIntoViewIfSupported(createErrorRef.current)
    }
  }, [createError])

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
    saveToLocalStorage(ROSAC_STORAGE_KEYS.characteristics, updated)
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
    saveToLocalStorage(ROSAC_STORAGE_KEYS.activities, updated)
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
    }

    const updated = constructionStages.map((s) =>
      s.id === editingStageId
        ? ({
            ...s,
            title: values.title,
            description: values.description,
          } as ConstructionStage)
        : s,
    )
    setConstructionStages(updated as unknown as typeof constructionStages)
    saveToLocalStorage(ROSAC_STORAGE_KEYS.stages, updated)
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
    saveToLocalStorage(ROSAC_STORAGE_KEYS.instruments, updated)
    closeInstrumentEditor()
  }

  async function handleCreateInstrument(values: RosacInstrumentFormValues, close: () => void) {
    setInstrumentCreateError(null)

    if (onCreateInstrument) {
      const err = await onCreateInstrument(values)
      if (err) {
        setInstrumentCreateError(err)
        return
      }
    }

    const newId = `instrument-${Date.now()}`
    const newInstrument: RosacInstrumentCardContent = {
      id: newId,
      name: values.name,
      pendingMessage: values.pendingMessage,
      image: values.image,
      consultation: values.consultation,
    }

    const updated = [...instruments, newInstrument]
    setInstruments(updated)
    saveToLocalStorage(ROSAC_STORAGE_KEYS.instruments, updated)
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
    }

    const updated = instruments.filter((inst) => inst.id !== id)
    setInstruments(updated)
    saveToLocalStorage(ROSAC_STORAGE_KEYS.instruments, updated)
  }

  // --- Section 7: Researcher Handlers (Preserved unchanged) ---
  async function handleSaveResearcher(
    id: string,
    values: ResearcherFormValues,
  ): Promise<string | null> {
    let response: Response
    try {
      response = await fetch(`/api/researchers/${id}`, {
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

    router.refresh()
    return null
  }

  async function handleCreateResearcher(values: ResearcherFormValues, close: () => void) {
    setCreateError(null)

    let response: Response
    try {
      response = await fetch('/api/researchers', {
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
    saveToLocalStorage(ROSAC_STORAGE_KEYS.acknowledgments, updated)
    return null
  }

  async function handleCreateAcknowledgment(
    values: RosacAcknowledgmentFormValues,
    close: () => void,
  ) {
    setAcknowledgmentCreateError(null)

    if (onCreateAcknowledgment) {
      const err = await onCreateAcknowledgment(values)
      if (err) {
        setAcknowledgmentCreateError(err)
        return
      }
    }

    const newId = `ack-${Date.now()}`
    const newInstitution: RosacAcknowledgment = {
      id: newId,
      name: values.name,
      logo: values.logo,
    }

    const updated = [...acknowledgments, newInstitution]
    setAcknowledgments(updated)
    saveToLocalStorage(ROSAC_STORAGE_KEYS.acknowledgments, updated)
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
    }

    const updated = acknowledgments.filter((inst) => inst.id !== id)
    setAcknowledgments(updated)
    saveToLocalStorage(ROSAC_STORAGE_KEYS.acknowledgments, updated)
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
          {characteristics.map((item) => {
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
        <RosacLocationMapLoader location={content.location} />
      </TopicSection>

      {/* SECCIÓN 3: Actividades científicas (SOLO EDITAR CONTENIDO, 3 tarjetas fijas) */}
      <TopicSection title={content.activities.title} titleId="rosac-activities-title" index="3">
        <CardGrid columns={3} equalHeight>
          {activities.map((item) => {
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
          onEditStage={(stage) => openStageEditor(stage.id)}
          stages={constructionStages}
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
            {instruments.map((instrument) => {
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
            {instruments.map((instrument) => {
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
          label={content.team.title}
          people={content.team.people}
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
                    {createError ? (
                      <p className="form-alert" ref={createErrorRef} role="alert">
                        {createError}
                      </p>
                    ) : null}
                    <ResearcherForm
                      confirmMessage="¿Desea agregar este investigador?"
                      confirmTitle="Agregar investigador"
                      onCancel={() => {
                        setCreateError(null)
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
        id="agradecimientos"
        index="8"
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
          institutions={acknowledgments}
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
                      onCancel={close}
                      onSave={(values) => handleCreateAcknowledgment(values, close)}
                    />
                  </>
                )}
              </AddItemCard>
            ) : undefined
          }
        />
      </TopicSection>

      <TopicSection
        id="donaciones"
        index="9"
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
        index="10"
        title={content.scientificConsultation.title}
        titleId="rosac-science-title"
        wide
      >
        <div className={`topic-highlight ${styles.ctaBox}`}>
          <div className={styles.ctaText}>
            <p>{content.scientificConsultation.description}</p>
          </div>
          <Button
            href={content.scientificConsultation.href}
            fullPageLoad
            variant="primary"
            icon={<ChartNoAxesCombined aria-hidden="true" size={20} strokeWidth={1.8} />}
          >
            {content.scientificConsultation.buttonLabel}
          </Button>
        </div>
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
