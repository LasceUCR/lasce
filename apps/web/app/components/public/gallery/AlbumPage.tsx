'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AlbumMediaGrid } from './AlbumMediaGrid'
import { AlbumTile } from './AlbumTile'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { Modal } from '@/app/components/public/Modal'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import {
  slugFromTitle,
  type GalleryMedia,
  type GallerySubAlbum,
  type ReviewConfirmation,
} from '@/app/lib/gallery-schema'

const blankAlbum: AlbumFormValues = {
  title: '',
  description: '',
  yearsLabel: '',
  coverObjectKey: '',
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
  const t = useTranslations('gallery.albumPage')
  const tCommon = useTranslations('gallery.common')
  const tFeedback = useTranslations('gallery.feedback')
  const tActions = useTranslations('gallery.actions')
  const sendWithFeedback = useRequestFeedback()
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const createInProgress = useRef(false)
  const saveInProgress = useRef(false)
  const createForm = useRef<AlbumFormHandle>(null)
  const editForm = useRef<AlbumFormHandle>(null)

  async function handleCreate(values: AlbumFormValues, close: () => void): Promise<void> {
    if (!parentAlbumId || createInProgress.current) return

    const slug = slugFromTitle(values.title)
    if (!slug) return

    createInProgress.current = true
    setIsCreating(true)

    try {
      await sendWithFeedback(
        `/api/gallery/albums/${parentAlbumId}`,
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

  async function handleDelete(albumId: string): Promise<void> {
    await sendWithFeedback(
      `/api/gallery/albums/${albumId}`,
      { method: 'DELETE' },
      {
        success: tFeedback('subAlbumDeleted'),
        fallback: tFeedback('subAlbumDeleteFailed'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  function handleUpdate(subAlbum: GallerySubAlbum): void {
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
    const albumId = editingSubAlbum?.id
    const version = editingSubAlbum?.editing?.version
    if (!albumId || !version || saveInProgress.current) return

    saveInProgress.current = true
    setIsSaving(true)

    try {
      await sendWithFeedback(
        `/api/gallery/albums/${albumId}`,
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
          success: tFeedback('subAlbumUpdated'),
          fallback: tFeedback('subAlbumSaveFailed'),
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

  const showEditor = editMode && (canEdit || canDelete)

  return (
    <article className="topic-page">
      <TopicHero kicker={tCommon('gallery')} lead={description} notice={meta} title={title} />

      {parentSlug && (subAlbums.length > 0 || (editMode && canCreate && parentAlbumId)) ? (
        <TopicSection title={tCommon('subalbumsTitle')} titleId="album-subalbums">
          <ul className="card-grid card-grid-3 tile-list gallery-subalbum-list">
            {editMode && canCreate && parentAlbumId ? (
              <li className="gallery-subalbum-add">
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
            {subAlbums.map((subAlbum) => {
              const subAlbumId = subAlbum.id

              return (
                <li key={subAlbum.slug}>
                  {showEditor ? (
                    <EditableWrapper
                      deleteLabel={tActions('deleteItem', { title: subAlbum.title })}
                      deleteConfirmTitle={tActions('deleteSubAlbum')}
                      deleteConfirmMessage={tActions('deleteMessage', { title: subAlbum.title })}
                      editLabel={tActions('editItem', { title: subAlbum.title })}
                      onDelete={
                        canDelete && subAlbumId ? () => handleDelete(subAlbumId) : undefined
                      }
                      onEdit={canEdit && subAlbumId ? () => handleUpdate(subAlbum) : undefined}
                    >
                      <AlbumTile
                        href={subAlbumPath(parentSlug, subAlbum.slug)}
                        meta={tCommon('files', { count: subAlbum.media.length })}
                        src={subAlbum.src}
                        title={subAlbum.title}
                      />
                    </EditableWrapper>
                  ) : (
                    <AlbumTile
                      href={subAlbumPath(parentSlug, subAlbum.slug)}
                      meta={tCommon('files', { count: subAlbum.media.length })}
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
        badge={t('albumFiles', { count: media.length })}
        title={t('albumContent')}
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
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else closeEditor()
        }}
        open={isEditing && editingSubAlbum !== null}
        size="large"
        title={tActions('editQuoted', { title: editingSubAlbum?.title ?? '' })}
      >
        {isSaving ? <p role="status">{tActions('savingSubAlbum')}</p> : null}
        {editingSubAlbum ? (
          <AlbumForm
            stored={editingSubAlbum.editing?.content}
            isLegacy={editingSubAlbum.editing?.isLegacy}
            album={{
              title: editingSubAlbum.title,
              description: editingSubAlbum.description,
              yearsLabel: editingSubAlbum.yearsLabel ?? '',
              coverObjectKey: editingSubAlbum.coverObjectKey ?? '',
            }}
            onCancel={closeEditor}
            onSave={handleSave}
            ref={editForm}
          />
        ) : null}
      </Modal>

      <div className="topic-page-footer gallery-album-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
