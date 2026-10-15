'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AlbumMediaGrid } from './AlbumMediaGrid'
import { AlbumTile } from './AlbumTile'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { Modal } from '@/app/components/public/Modal'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { AlbumForm, type AlbumFormValues } from '@/app/components/public/gallery/forms/AlbumForm'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { GalleryMedia, GallerySubAlbum } from '@/app/lib/gallery-schema'

const blankAlbum: AlbumFormValues = {
  title: '',
  description: '',
  yearsLabel: '',
  coverObjectKey: '',
}

const CREATE_ERROR_MESSAGE = 'No se pudo crear el subálbum. Inténtelo de nuevo.'
const SAVE_ERROR_MESSAGE = 'No se pudo guardar el álbum. Inténtelo de nuevo.'
const DELETE_ERROR_MESSAGE = 'No se pudo eliminar el subálbum. Inténtelo de nuevo.'

function slugFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function albumMediaMeta(media: readonly GalleryMedia[]): string {
  return `${media.length} archivos en este álbum`
}

function subAlbumPath(albumSlug: string, subAlbumSlug: string): string {
  return `/galeria/${albumSlug}/${subAlbumSlug}`
}

export interface AlbumPageProps {
  title: string
  description: string
  /** Summary line under the title: file counts and the period covered. */
  meta: string
  media: readonly GalleryMedia[]
  /** Empty on a sub-album page, which has no children of its own. */
  subAlbums?: readonly GallerySubAlbum[]
  /** Slug the sub-album links hang off. Required when `subAlbums` is given. */
  parentSlug?: string
  /** Database id of the parent album, required to create sub-albums. */
  parentAlbumId?: string
  /** Database id of the album whose media is shown, required to add files. */
  albumId?: string
  /** Name of the signed-in user, recorded as the uploader of new files. */
  uploader?: string
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  backHref?: string
  backLabel?: string
}

/**
 * The detail page shared by albums and sub-albums: they differ only in whether
 * they list children and in where their back link points.
 */
export function AlbumPage({
  title,
  description,
  meta,
  media,
  subAlbums = [],
  parentSlug,
  parentAlbumId,
  albumId,
  uploader,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  backHref = '/galeria',
  backLabel = 'Volver a la galería',
}: AlbumPageProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const [editingSubAlbum, setEditingSubAlbum] = useState<GallerySubAlbum | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const createInProgress = useRef(false)
  const saveInProgress = useRef(false)
  const deleteInProgress = useRef(false)

  async function handleCreate(values: AlbumFormValues, close: () => void): Promise<void> {
    if (!parentAlbumId || createInProgress.current) return

    const slug = slugFromTitle(values.title)
    if (!slug) {
      setCreateError('El título del subálbum debe incluir letras o números.')
      return
    }

    createInProgress.current = true
    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch(`/api/gallery/albums/${parentAlbumId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: values.title,
          description: values.description,
          yearsLabel: values.yearsLabel.trim() || null,
          coverObjectKey: values.coverObjectKey,
        }),
      })

      if (!response.ok) {
        const body: { error?: string } | null = await response.json().catch(() => null)
        setCreateError(body?.error ?? CREATE_ERROR_MESSAGE)
        return
      }

      close()
      router.refresh()
    } catch {
      setCreateError(CREATE_ERROR_MESSAGE)
    } finally {
      createInProgress.current = false
      setIsCreating(false)
    }
  }

  async function handleDelete(albumId: string): Promise<void> {
    if (deleteInProgress.current) return

    deleteInProgress.current = true
    setDeleteError(null)

    try {
      const response = await fetch(`/api/gallery/albums/${albumId}`, { method: 'DELETE' })
      if (!response.ok) {
        const body: { error?: string } | null = await response.json().catch(() => null)
        setDeleteError(body?.error ?? DELETE_ERROR_MESSAGE)
        return
      }

      router.refresh()
    } catch {
      setDeleteError(DELETE_ERROR_MESSAGE)
    } finally {
      deleteInProgress.current = false
    }
  }

  function handleUpdate(subAlbum: GallerySubAlbum): void {
    setSaveError(null)
    setEditingSubAlbum(subAlbum)
    setIsEditing(true)
  }

  function closeEditor(): void {
    setSaveError(null)
    setIsEditing(false)
    setEditingSubAlbum(null)
  }

  async function handleSave(values: AlbumFormValues): Promise<void> {
    const albumId = editingSubAlbum?.id
    if (!albumId || saveInProgress.current) return

    saveInProgress.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(`/api/gallery/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          yearsLabel: values.yearsLabel.trim() || null,
          coverObjectKey: values.coverObjectKey || null,
        }),
      })

      if (!response.ok) {
        const body: { error?: string } | null = await response.json().catch(() => null)
        setSaveError(body?.error ?? SAVE_ERROR_MESSAGE)
        return
      }

      closeEditor()
      router.refresh()
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
    } finally {
      saveInProgress.current = false
      setIsSaving(false)
    }
  }

  const showEditor = editMode && (canEdit || canDelete)

  return (
    <article className="topic-page">
      <TopicHero kicker="Galería LASCE" lead={description} notice={meta} title={title} />

      {deleteError ? (
        <p className="form-alert" role="alert">
          {deleteError}
        </p>
      ) : null}

      {parentSlug && (subAlbums.length > 0 || (editMode && canCreate && parentAlbumId)) ? (
        <TopicSection title="Subálbumes" titleId="album-subalbums">
          <ul className="card-grid card-grid-3 tile-list gallery-subalbum-list">
            {editMode && canCreate && parentAlbumId ? (
              <li className="gallery-subalbum-add">
                <AddItemCard label="Añadir subálbum">
                  {({ close }) => (
                    <>
                      {createError ? (
                        <p className="form-alert" role="alert">
                          {createError}
                        </p>
                      ) : null}
                      {isCreating ? <p role="status">Creando subálbum...</p> : null}
                      <AlbumForm
                        album={blankAlbum}
                        confirmTitle="Crear subálbum"
                        confirmMessage="¿Desea crear este subálbum?"
                        onCancel={() => {
                          setCreateError(null)
                          close()
                        }}
                        onSave={(values) => handleCreate(values, close)}
                      />
                    </>
                  )}
                </AddItemCard>
              </li>
            ) : null}
            {subAlbums.map((subAlbum) => {
              const subAlbumId = subAlbum.id

              return (
                <li key={subAlbum.slug}>
                  {showEditor ? (
                    <EditableWrapper
                      deleteLabel={`Eliminar ${subAlbum.title}`}
                      deleteConfirmTitle="Eliminar subálbum"
                      deleteConfirmMessage={`¿Desea eliminar "${subAlbum.title}"? Esta acción no se puede deshacer.`}
                      editLabel={`Editar ${subAlbum.title}`}
                      onDelete={
                        canDelete && subAlbumId ? () => handleDelete(subAlbumId) : undefined
                      }
                      onEdit={canEdit && subAlbumId ? () => handleUpdate(subAlbum) : undefined}
                    >
                      <AlbumTile
                        href={subAlbumPath(parentSlug, subAlbum.slug)}
                        meta={`${subAlbum.media.length} archivos`}
                        src={subAlbum.src}
                        title={subAlbum.title}
                      />
                    </EditableWrapper>
                  ) : (
                    <AlbumTile
                      href={subAlbumPath(parentSlug, subAlbum.slug)}
                      meta={`${subAlbum.media.length} archivos`}
                      src={subAlbum.src}
                      title={subAlbum.title}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </TopicSection>
      ) : null}

      <TopicSection
        badge={albumMediaMeta(media)}
        title="Fotografías y video de este álbum"
        titleId="album-media"
      >
        <AlbumMediaGrid
          albumTitle={title}
          media={media}
          editMode={editMode}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
          albumId={albumId}
          uploader={uploader}
        />
      </TopicSection>

      <Modal
        onClose={closeEditor}
        open={isEditing && editingSubAlbum !== null}
        title={`Editar "${editingSubAlbum?.title ?? ''}"`}
      >
        {saveError ? (
          <p className="form-alert" role="alert">
            {saveError}
          </p>
        ) : null}
        {isSaving ? <p role="status">Guardando subálbum...</p> : null}
        {editingSubAlbum ? (
          <AlbumForm
            album={{
              title: editingSubAlbum.title,
              description: editingSubAlbum.description,
              yearsLabel: editingSubAlbum.yearsLabel ?? '',
              coverObjectKey: editingSubAlbum.coverObjectKey ?? '',
            }}
            onCancel={closeEditor}
            onSave={handleSave}
          />
        ) : null}
      </Modal>

      <div className="topic-page-footer gallery-album-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
