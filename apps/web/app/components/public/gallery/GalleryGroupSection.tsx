'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AlbumTile } from './AlbumTile'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { Modal } from '@/app/components/public/Modal'
import { AlbumForm, type AlbumFormValues } from '@/app/components/public/gallery/forms/AlbumForm'
import type { GalleryAlbum } from '@/app/lib/gallery'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el álbum. Inténtelo de nuevo.'
const DELETE_ERROR_MESSAGE = 'No se pudo eliminar el álbum. Inténtelo de nuevo.'

function albumPath(slug: string): string {
  return `/galeria/${slug}`
}

function subAlbumPath(albumSlug: string, subAlbumSlug: string): string {
  return `/galeria/${albumSlug}/${subAlbumSlug}`
}

function albumMeta(album: GalleryAlbum): string {
  const fileCount = album.subAlbums.reduce(
    (total, subAlbum) => total + subAlbum.media.length,
    album.media.length,
  )
  const parts = [`${fileCount} archivos`, album.years]

  if (album.subAlbums.length > 0) {
    parts.unshift(`${album.subAlbums.length} subálbumes`)
  }

  return parts.join(' · ')
}

export interface GalleryGroupSectionProps {
  album: GalleryAlbum
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
}

/**
 * One block of the gallery index: the album's cover tile followed by its
 * sub-albums. Every tile is the same size and the grid wraps, so the number of
 * sub-albums changes how many rows a block occupies, never how wide its cards
 * are. Card sizing lives entirely in `.gallery-grid`; nothing here measures.
 */
export function GalleryGroupSection({
  album,
  canEdit = false,
  canDelete = false,
  canCreate: _canCreate = false,
}: GalleryGroupSectionProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const headingId = `galeria-${album.slug}`
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveInProgress = useRef(false)
  const deleteInProgress = useRef(false)

  async function handleDelete(): Promise<void> {
    if (!album.id || deleteInProgress.current) return

    deleteInProgress.current = true
    setDeleteError(null)

    try {
      const response = await fetch(`/api/gallery/albums/${album.id}`, { method: 'DELETE' })
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

  function handleUpdate(): void {
    setSaveError(null)
    setIsEditing(true)
  }

  function closeEditor(): void {
    setSaveError(null)
    setIsEditing(false)
  }

  async function handleSave(values: AlbumFormValues): Promise<void> {
    if (!album.id || saveInProgress.current) return

    saveInProgress.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(`/api/gallery/albums/${album.id}`, {
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

  const cover = (
    <AlbumTile
      href={albumPath(album.slug)}
      meta={albumMeta(album)}
      src={album.coverObjectKey}
      title={album.title}
      variant="cover"
    />
  )

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        <h2 id={headingId}>{album.title}</h2>
        <span className="gallery-group-meta">{albumMeta(album)}</span>
      </div>
      <p className="gallery-group-description">{album.description}</p>
      {deleteError ? (
        <p className="form-alert" role="alert">
          {deleteError}
        </p>
      ) : null}

      {/* A list, so a reader can be told how many albums this block holds
          and can step through them. The grid still owns the layout. */}
      <ul className="gallery-grid tile-list">
        <li>
          {editMode && (canEdit || canDelete) ? (
            <EditableWrapper
              className="gallery-grid-editable"
              deleteConfirmTitle="Eliminar álbum"
              deleteConfirmMessage={`¿Desea eliminar "${album.title}"? Esta acción no se puede deshacer.`}
              deleteLabel={`Eliminar ${album.title}`}
              editLabel={`Editar ${album.title}`}
              onDelete={() => handleDelete()}
              onEdit={() => handleUpdate()}
            >
              {cover}
            </EditableWrapper>
          ) : (
            cover
          )}
        </li>
        {album.subAlbums.map((subAlbum) => (
          <li key={subAlbum.slug}>
            <AlbumTile
              href={subAlbumPath(album.slug, subAlbum.slug)}
              meta={`${subAlbum.media.length} archivos`}
              src={subAlbum.coverObjectKey}
              title={subAlbum.title}
            />
          </li>
        ))}
      </ul>

      <Modal onClose={closeEditor} open={isEditing} title={`Editar "${album.title}"`}>
        {saveError ? (
          <p className="form-alert" role="alert">
            {saveError}
          </p>
        ) : null}
        {isSaving ? <p role="status">Guardando álbum...</p> : null}
        <AlbumForm
          album={{
            title: album.title,
            description: album.description,
            yearsLabel: album.years,
            coverObjectKey: album.coverObjectKey ?? '',
          }}
          onCancel={closeEditor}
          onSave={handleSave}
        />
      </Modal>
    </section>
  )
}
