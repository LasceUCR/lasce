'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AlbumTile } from './AlbumTile'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { Modal } from '@/app/components/public/Modal'
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import type { GalleryAlbum, ReviewConfirmation } from '@/app/lib/gallery-schema'

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
  const t = useTranslations('gallery.feedback')
  const tActions = useTranslations('gallery.actions')
  const sendWithFeedback = useRequestFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const saveInProgress = useRef(false)
  const editForm = useRef<AlbumFormHandle>(null)

  async function handleDelete(): Promise<void> {
    if (!album.id) return

    await sendWithFeedback(
      `/api/gallery/albums/${album.id}`,
      { method: 'DELETE' },
      {
        success: t('albumDeleted'),
        fallback: t('albumDeleteFailed'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  function handleUpdate(): void {
    setIsEditing(true)
  }

  function closeEditor(): void {
    setIsEditing(false)
  }

  async function handleSave(
    values: AlbumFormValues,
    confirmed: ReviewConfirmation[],
  ): Promise<void> {
    const version = album.editing?.version
    if (!album.id || !version || saveInProgress.current) return

    saveInProgress.current = true
    setIsSaving(true)

    try {
      await sendWithFeedback(
        `/api/gallery/albums/${album.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version,
            ...(values.content ? { content: values.content, confirmedUnchanged: confirmed } : {}),
            yearsLabel: values.yearsLabel.trim() || null,
            coverObjectKey: values.coverObjectKey || null,
          }),
        },
        {
          success: t('albumUpdated'),
          fallback: t('albumSaveFailed'),
          onSuccess: () => {
            closeEditor()
            router.refresh()
          },
        },
      )
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

      {/* A list, so a reader can be told how many albums this block holds
          and can step through them. The grid still owns the layout. */}
      <ul className="gallery-grid tile-list">
        <li>
          {editMode && (canEdit || canDelete) ? (
            <EditableWrapper
              className="gallery-grid-editable"
              deleteConfirmTitle={tActions('deleteAlbum')}
              deleteConfirmMessage={tActions('deleteMessage', { title: album.title })}
              deleteLabel={tActions('deleteItem', { title: album.title })}
              editLabel={tActions('editItem', { title: album.title })}
              onDelete={canDelete ? () => handleDelete() : undefined}
              onEdit={canEdit ? () => handleUpdate() : undefined}
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

      <Modal
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else closeEditor()
        }}
        open={isEditing}
        title={tActions('editQuoted', { title: album.title })}
        size="large"
      >
        {isSaving ? <p role="status">{tActions('savingAlbum')}</p> : null}
        <AlbumForm
          stored={album.editing?.content}
          isLegacy={album.editing?.isLegacy}
          album={{
            title: album.title,
            description: album.description,
            yearsLabel: album.years,
            coverObjectKey: album.coverObjectKey ?? '',
          }}
          onCancel={closeEditor}
          onSave={handleSave}
          ref={editForm}
        />
      </Modal>
    </section>
  )
}
