'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AlbumTile } from './AlbumTile'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { Modal } from '@/app/components/public/Modal'
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  slugFromTitle,
  type GalleryAlbum,
  type GallerySubAlbum,
  type ReviewConfirmation,
} from '@/app/lib/gallery-schema'

const blankAlbum: AlbumFormValues = {
  title: '',
  description: '',
  yearsLabel: '',
  coverObjectKey: '',
}

function albumPath(slug: string): string {
  return `/galeria/${slug}`
}

function subAlbumPath(albumSlug: string, subAlbumSlug: string): string {
  return `/galeria/${albumSlug}/${subAlbumSlug}`
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
  canCreate = false,
}: GalleryGroupSectionProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const headingId = `galeria-${album.slug}`
  const [isEditing, setIsEditing] = useState(false)
  const [editingSubAlbum, setEditingSubAlbum] = useState<GallerySubAlbum | null>(null)
  const t = useTranslations('gallery.common')
  const tFeedback = useTranslations('gallery.feedback')
  const tActions = useTranslations('gallery.actions')
  const sendWithFeedback = useRequestFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const createInProgress = useRef(false)
  const createForm = useRef<AlbumFormHandle>(null)
  const saveInProgress = useRef(false)
  const editForm = useRef<AlbumFormHandle>(null)
  const fileCount = album.subAlbums.reduce(
    (total, subAlbum) => total + subAlbum.media.length,
    album.media.length,
  )
  const summaryParts = [t('files', { count: fileCount }), album.years]
  if (album.subAlbums.length > 0) {
    summaryParts.unshift(t('subalbums', { count: album.subAlbums.length }))
  }
  const summary = summaryParts.join(' · ')

  async function handleCreate(values: AlbumFormValues, close: () => void): Promise<void> {
    const slug = slugFromTitle(values.title)
    if (!album.id || !slug || createInProgress.current) return

    createInProgress.current = true
    setIsCreating(true)

    try {
      await sendWithFeedback(
        `/api/gallery/albums/${album.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            content: values.content,
            yearsLabel: values.yearsLabel.trim() || null,
            coverObjectKey: values.coverObjectKey,
          }),
        },
        {
          success: tFeedback('subAlbumCreated'),
          fallback: tFeedback('subAlbumCreateFailed'),
          onSuccess: () => {
            close()
            router.refresh()
          },
        },
      )
    } finally {
      createInProgress.current = false
      setIsCreating(false)
    }
  }

  async function handleDelete(target: { id?: string }, isSub: boolean): Promise<void> {
    if (!target.id) return

    await sendWithFeedback(
      `/api/gallery/albums/${target.id}`,
      { method: 'DELETE' },
      {
        success: tFeedback(isSub ? 'subAlbumDeleted' : 'albumDeleted'),
        fallback: tFeedback(isSub ? 'subAlbumDeleteFailed' : 'albumDeleteFailed'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  function handleUpdate(subAlbum: GallerySubAlbum | null = null): void {
    setEditingSubAlbum(subAlbum)
    setIsEditing(true)
  }

  function closeEditor(): void {
    setIsEditing(false)
    setEditingSubAlbum(null)
  }

  async function handleSave(
    values: AlbumFormValues,
    confirmed: ReviewConfirmation[],
  ): Promise<void> {
    const isSub = editingSubAlbum !== null
    const target = editingSubAlbum ?? album
    const version = target.editing?.version
    if (!target.id || !version || saveInProgress.current) return

    saveInProgress.current = true
    setIsSaving(true)

    try {
      await sendWithFeedback(
        `/api/gallery/albums/${target.id}`,
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
          success: tFeedback(isSub ? 'subAlbumUpdated' : 'albumUpdated'),
          fallback: tFeedback(isSub ? 'subAlbumSaveFailed' : 'albumSaveFailed'),
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
      meta={summary}
      src={album.coverObjectKey}
      title={album.title}
      variant="cover"
    />
  )

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        <h2 id={headingId}>{album.title}</h2>
        <span className="gallery-group-meta">{summary}</span>
      </div>
      <p className="gallery-group-description">{album.description}</p>

      {/* A list, so a reader can be told how many albums this block holds
          and can step through them. The grid still owns the layout. */}
      <ul className="gallery-grid tile-list">
        {editMode && canCreate && album.id ? (
          <li>
            <AddItemCard
              label={tActions('addSubAlbum')}
              onRequestClose={(close) => {
                if (createForm.current) createForm.current.requestCancel()
                else close()
              }}
              size="large"
            >
              {({ close }) => (
                <>
                  {isCreating ? <p role="status">{tActions('creatingSubAlbum')}</p> : null}
                  <AlbumForm
                    album={blankAlbum}
                    requireSlug
                    onCancel={close}
                    onSave={(values) => handleCreate(values, close)}
                    ref={createForm}
                  />
                </>
              )}
            </AddItemCard>
          </li>
        ) : null}
        <li>
          {editMode && (canEdit || canDelete) ? (
            <EditableWrapper
              className="gallery-grid-editable"
              deleteConfirmTitle={tActions('deleteAlbum')}
              deleteConfirmMessage={tActions('deleteMessage', { title: album.title })}
              deleteLabel={tActions('deleteItem', { title: album.title })}
              editLabel={tActions('editItem', { title: album.title })}
              onDelete={canDelete ? () => handleDelete(album, false) : undefined}
              onEdit={canEdit ? () => handleUpdate() : undefined}
            >
              {cover}
            </EditableWrapper>
          ) : (
            cover
          )}
        </li>
        {album.subAlbums.map((subAlbum) => {
          const tile = (
            <AlbumTile
              href={subAlbumPath(album.slug, subAlbum.slug)}
              meta={t('files', { count: subAlbum.media.length })}
              src={subAlbum.coverObjectKey}
              title={subAlbum.title}
            />
          )

          return (
            <li key={subAlbum.slug}>
              {editMode && (canEdit || canDelete) && subAlbum.id ? (
                <EditableWrapper
                  className="gallery-grid-editable"
                  deleteConfirmTitle={tActions('deleteSubAlbum')}
                  deleteConfirmMessage={tActions('deleteMessage', { title: subAlbum.title })}
                  deleteLabel={tActions('deleteItem', { title: subAlbum.title })}
                  editLabel={tActions('editItem', { title: subAlbum.title })}
                  onDelete={canDelete ? () => handleDelete(subAlbum, true) : undefined}
                  onEdit={canEdit ? () => handleUpdate(subAlbum) : undefined}
                >
                  {tile}
                </EditableWrapper>
              ) : (
                tile
              )}
            </li>
          )
        })}
      </ul>

      <Modal
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else closeEditor()
        }}
        open={isEditing}
        title={tActions('editQuoted', { title: (editingSubAlbum ?? album).title })}
        size="large"
      >
        {isSaving ? (
          <p role="status">{tActions(editingSubAlbum ? 'savingSubAlbum' : 'savingAlbum')}</p>
        ) : null}
        <AlbumForm
          key={editingSubAlbum?.slug ?? album.slug}
          stored={(editingSubAlbum ?? album).editing?.content}
          isLegacy={(editingSubAlbum ?? album).editing?.isLegacy}
          album={
            editingSubAlbum
              ? {
                  title: editingSubAlbum.title,
                  description: editingSubAlbum.description,
                  yearsLabel: editingSubAlbum.yearsLabel ?? '',
                  coverObjectKey: editingSubAlbum.coverObjectKey ?? '',
                }
              : {
                  title: album.title,
                  description: album.description,
                  yearsLabel: album.years,
                  coverObjectKey: album.coverObjectKey ?? '',
                }
          }
          onCancel={closeEditor}
          onSave={handleSave}
          ref={editForm}
        />
      </Modal>
    </section>
  )
}
