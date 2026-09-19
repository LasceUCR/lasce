'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AlbumTile } from '../gallery/AlbumTile'
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
    <section aria-labelledby={titleId} className="research-areas page-width" id={id}>
      <div className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <p className="research-areas-description">{subtitle}</p>
      </div>

      {saveError ? (
        <p className="form-alert" role="alert">
          {saveError}
        </p>
      ) : null}

      {editMode && canCreate && areas.length === 0 ? (
        <p className="research-areas-description">
          Haga clic en &quot;Añadir&quot; para agregar un área de investigación.
        </p>
      ) : null}

      <div className="gallery-grid">
        {areas.map((area) => {
          const showEditor = editMode && (canEdit || canDelete)

          if (!showEditor) {
            return (
              <AlbumTile
                href={`/investigacion/areas/${area.slug}`}
                key={area.slug}
                meta="Conozca más sobre esta área"
                src={area.src}
                title={area.title}
              />
            )
          }

          return (
            <EditableWrapper
              key={area.slug}
              deleteConfirmMessage={`¿Desea eliminar "${area.title}"? Esta acción no se puede deshacer.`}
              deleteConfirmTitle="Eliminar área"
              deleteLabel={`Eliminar ${area.title}`}
              editLabel={`Editar ${area.title}`}
              onDelete={canDelete ? () => handleDeleteArea(area.slug) : undefined}
              onEdit={canEdit ? () => openEditor(area.slug) : undefined}
            >
              <AlbumTile
                href={`/investigacion/areas/${area.slug}`}
                key={area.slug}
                meta="Conozca más sobre esta área"
                src={area.src}
                title={area.title}
              />
            </EditableWrapper>
          )
        })}

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
                  confirmMessage="¿Desea agregar esta área de investigación?"
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
      </div>

      <Modal
        onClose={closeEditor}
        open={editingArea !== undefined}
        title={editingArea ? `Editar "${editingArea.title}"` : 'Editar área de investigación'}
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
              onCancel={closeEditor}
              onSave={handleSaveArea}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
