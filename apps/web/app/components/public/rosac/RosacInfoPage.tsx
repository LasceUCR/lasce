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
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { InfoCard } from '@/app/components/public/topic/InfoCard'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { RosacCardIcon, RosacInfoContent } from '@/app/lib/rosac'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import styles from './RosacInfoPage.module.css'
import { AcknowledgmentsGallery } from './AcknowledgmentsGallery'
import { ConstructionCarousel } from './ConstructionCarousel'
import { DonationCard } from './DonationCard'
import { EditableResearcherCard } from './EditableResearcherCard'
import { InstrumentCard } from './InstrumentCard'
import { ResearcherForm, type ResearcherFormValues } from './ResearcherForm'
import { RosacLocationMapLoader } from './RosacLocationMapLoader'
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
}

export function RosacInfoPage({
  content,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: RosacInfoPageProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const createErrorRef = useRef<HTMLParagraphElement>(null)

  // Scrolls the "Añadir investigador" error into view as soon as it appears —
  // same reasoning as `ResearcherForm`'s own upload error.
  useEffect(() => {
    if (createError) {
      scrollIntoViewIfSupported(createErrorRef.current)
    }
  }, [createError])

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

    // Re-runs the server component's `getResearchers()` so the page reflects the saved
    // change immediately, without an optimistic guess.
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

      <TopicSection
        title={content.characteristics.title}
        titleId="rosac-characteristics-title"
        index="1"
      >
        <CardGrid columns={4} equalHeight>
          {content.characteristics.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <InfoCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
              />
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

      <TopicSection title={content.activities.title} titleId="rosac-activities-title" index="3">
        <CardGrid columns={3} equalHeight>
          {content.activities.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <InfoCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={<Icon size={22} strokeWidth={1.8} />}
              />
            )
          })}
        </CardGrid>
      </TopicSection>

      <TopicSection
        id="construccion"
        title={content.construction.title}
        titleId="rosac-construction-title"
        intro={content.construction.intro}
        index="4"
        wide
      >
        <ConstructionCarousel stages={content.construction.stages} />
      </TopicSection>

      <TopicSection
        title={content.radioObservation.title}
        titleId="rosac-radio-observation-title"
        index="5"
        wide
      >
        {content.radioObservation.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection title={content.relationship.title} titleId="rosac-relationship-title" featured>
        {content.relationship.paragraphs.map((paragraph) => (
          <p className="topic-intro" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </TopicSection>

      <TopicSection
        id="instrumentos"
        index="6"
        title={content.instruments.title}
        titleId="rosac-instruments-title"
        intro={content.instruments.intro}
        className={styles.instrumentsSection}
        wide
      >
        <CardGrid columns={3} equalHeight>
          {content.instruments.items.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </CardGrid>
      </TopicSection>

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
        <AcknowledgmentsGallery
          institutions={content.acknowledgments.institutions}
          label={content.acknowledgments.title}
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
        <div className="news-list">
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
        title={content.scientificConsultation.title}
        titleId="rosac-science-title"
        wide
      >
        {/* Same call-to-action box as "¿Te gustaría ayudarnos?", so both primary actions on the
            page share one format. */}
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

      <div className="topic-page-footer page-width">
        <TopicBackLink {...content.backLink} />
      </div>
    </article>
  )
}
