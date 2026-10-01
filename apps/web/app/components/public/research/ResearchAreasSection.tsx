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
  title: ' ',
  description: '',
  src: '',
}

export interface ResearchArea {
  id: string
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
  const router = useRouter()
  const { editMode } = useEditMode()

  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const editingArea = areas.find((area) => area.id === editingAreaId)

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

  async function handleSaveArea(values: ResearchAreaFormValues) {
    if (!editingAreaId) return

    setSaveError(null)

    let response: Response
    try {
      response = await fetch(`/api/research-areas/${editingAreaId}`, {
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
    router.refresh()
  }

  async function handleCreateArea(values: ResearchAreaFormValues, close: () => void) {
    setCreateError(null)

    let response: Response
    try {
      response = await fetch('/api/research-areas', {
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

  async function handleDeleteArea(id: string) {
    setDeleteError(null)

    let response: Response
    try {
      response = await fetch(`/api/research-areas/${id}`, { method: 'DELETE' })
    } catch {
      setDeleteError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setDeleteError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    router.refresh()
  }

  return (
    <section className="research-areas page-width" id={id}>
      <header className="research-areas-header">
        <h2 id={titleId}>{title}</h2>
        <p>{subtitle}</p>
      </header>

      {deleteError ? (
        <p className="form-alert" role="alert">
          {deleteError}
        </p>
      ) : null}

      <div className="research-area-content">
        {editMode && canCreate ? (
          <AddItemCard label="Añadir">
            {({ close }) => (
              <>
                {createError ? (
                  <p className="form-alert" role="alert">
                    {createError}
                  </p>
                ) : null}
                <ResearchAreaForm
                  area={blankArea}
                  confirmMessage="¿Desea agregar esta área?"
                  confirmTitle="Agregar área"
                  onCancel={() => {
                    setCreateError(null)
                    close()
                  }}
                  onSave={(values) => handleCreateArea(values, close)}
                />
              </>
            )}
          </AddItemCard>
        ) : null}

        {areas.length > 0 ? (
          <ul className="research-area-list" aria-labelledby={titleId}>
            {areas.map((area) => (
              <li key={area.id}>
                <EditableWrapper
                  key={area.id}
                  onEdit={canEdit ? () => openEditor(area.id) : undefined}
                  onDelete={canDelete ? () => handleDeleteArea(area.id) : undefined}
                  deleteConfirmTitle="Eliminar área"
                >
                  <ResearchAreaCard
                    description={area.description}
                    href={`/investigacion/areas/${area.id}`}
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
            {saveError ? (
              <p className="form-alert" role="alert">
                {saveError}
              </p>
            ) : null}

            <ResearchAreaForm
              area={{
                title: editingArea.title,
                description: editingArea.description,
                src: editingArea.src ?? '',
              }}
              confirmMessage="¿Desea guardar los cambios?"
              confirmTitle="Editar área"
              onCancel={closeEditor}
              onSave={handleSaveArea}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
