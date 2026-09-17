'use client'

import { useId } from 'react'
import { useState } from 'react'
import { AlbumTile } from '../gallery/AlbumTile'
import { useRouter } from 'next/navigation'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

export interface ResearchArea {
  slug: string
  title: string
  description: string
  src?: string
}

export interface ResearchAreasSectionProps {
  id?: string
  title: string
  subtitle: string
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
  canDelete = false
}: ResearchAreasSectionProps
) {
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const router = useRouter()
  
  const editingActivity = areas.find((area) => area.slug === editingActivityId)
  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  function openEditor(id: string) {
    setSaveError(null)
    setEditingActivityId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingActivityId(null)
  }

  async function handleSaveActivity() {
  }
  
  async function handleCreateActivity(close: () => void) {
  }
  
  async function handleDeleteActivity(id: string) {
  }

  return (
    <section className="research-areas page-width" id={id} aria-labelledby={titleId}>
      <div className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <p className="research-areas-description">{subtitle}</p>
      </div>

      <div className="gallery-grid">
        {areas.map((area) => {
          const showEditor = editMode && (canEdit || canDelete)

          if (!showEditor) {
            return (
              <AlbumTile
                /* href={`/investigacion/areas/${area.slug}`} */
                key={area.slug}
                meta={area.description}
                src={area.src}
                title={area.title}
              />
            )
          }

          return (
            <EditableWrapper
              key={area.slug}
              deleteConfirmMessage={`¿Desea eliminar "${area.title}"? Esta acción no se puede deshacer.`}
              deleteConfirmTitle="Eliminar actividad"
              deleteLabel={`Eliminar ${area.title}`}
              editLabel={`Editar ${area.title}`}
              onDelete={canDelete ? () => handleDeleteActivity(area.slug) : undefined}
              onEdit={canEdit ? () => openEditor(area.slug) : undefined}
            >
              <AlbumTile
                /* href={`/investigacion/areas/${area.slug}`} */
                key={area.slug}
                meta={area.description}
                src={area.src}
                title={area.title}
              />
            </EditableWrapper>
          )
        })}
      </div>
    </section>
  )
}
