'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ResearchAreaCard } from './ResearchAreaCard'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

import { ResearchAreaForm, type ResearchAreaFormValues } from './ResearchAreaForm'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

const blankArea: ResearchAreaFormValues = {
  title: '',
  description: '',
  src: '',
}

export interface ResearchArea {
  slug: string
  title: string
  description: string
  src?: string
}

export interface ResearchAreasSectionProps {
  title: string
  subtitle: string
  id?: string
  areas: ResearchArea[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function ResearchAreasSection({
  id,
  title,
  subtitle,
  areas,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: ResearchAreasSectionProps) {
  const { editMode } = useEditMode()
  const router = useRouter()

  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const editingArea = areas.find((area) => area.slug === editingAreaId)

  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  function openEditor(id: string) {
    setSaveError(null)
    setEditingAreaId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingAreaId(null)
  }

  async function handleSaveArea(values: ResearchAreaFormValues) {}

  async function handleCreateArea(values: ResearchAreaFormValues, close: () => void) {}

  async function handleDeleteArea(id: string) {}

  return (
    <section className="research-areas page-width" id={id}>
      {areas.length > 0 ? (
        <ul className="research-area-list">
          {areas.map((area) => (
            <li key={area.slug}>
              <ResearchAreaCard
                description={area.description}
                href={`/investigacion/areas/${area.slug}`}
                src={area.src}
                title={area.title}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
