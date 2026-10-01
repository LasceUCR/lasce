'use client'

import { useId, useState } from 'react'

import { ResearchAreaCard } from './ResearchAreaCard'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

import { ResearchAreaForm, type ResearchAreaFormValues } from './ResearchAreaForm'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

const blankArea: ResearchAreaFormValues = {
  title: ' ',
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
      <header className="research-areas-header">
        <h2 id={titleId}>{title}</h2>
        <p>{subtitle}</p>
      </header>

      <div className="research-area-content">
        {editMode && canCreate ? (
          <AddItemCard label="Añadir">
            {({ close }) => (
              <ResearchAreaForm
                area={blankArea}
                confirmMessage="¿Desea agregar esta área?"
                confirmTitle="Agregar área"
                onCancel={close}
                onSave={(values) => handleCreateArea(values, close)}
              />
            )}
          </AddItemCard>
        ) : null}

        {areas.length > 0 ? (
          <ul className="research-area-list" aria-labelledby={titleId}>
            {areas.map((area) => (
              <li key={area.slug}>
                <EditableWrapper
                  key={area.slug}
                  onEdit={canEdit ? () => openEditor(area.slug) : undefined}
                  onDelete={canDelete ? () => handleDeleteArea(area.slug) : undefined}
                  deleteConfirmTitle="Eliminar área"
                >
                  <ResearchAreaCard
                    description={area.description}
                    href={`/investigacion/areas/${area.slug}`}
                    src={area.src}
                    title={area.title}
                  />
                </EditableWrapper>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Modal
        open={editingArea !== undefined}
        onClose={closeEditor}
        title={editingArea ? `Editar "${editingArea.title}"` : 'Editar área'}
      >
        {editingArea ? (
          <>
            {saveError ? <p className="form-alert">{saveError}</p> : null}

            <ResearchAreaForm
              area={{
                title: editingArea.title,
                description: editingArea.description,
                src: editingArea.src ?? '',
              }}
              confirmMessage="¿Desea agregar esta área?"
              confirmTitle="Agregar área"
              onCancel={closeEditor}
              onSave={handleSaveArea}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
