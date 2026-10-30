'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { MediaFrame } from './MediaFrame'
import { MediaLightbox } from './MediaLightbox'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { Button } from '@/app/components/public/Button'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'
import { MediaForm, type MediaFormHandle } from '@/app/components/public/gallery/forms/MediaForm'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  type GalleryAlbum,
  type GalleryMedia,
  type GallerySubAlbum,
  type ReviewConfirmation,
} from '@/app/lib/gallery-schema'

const closed = -1

function albumPath(slug: string): string {
  return `/galeria/${slug}`
}

export interface GalleryGroupSectionProps {
  album: GalleryAlbum
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
  uploader?: string
  featuredImageLimit?: number
}

/**
 * One block of the gallery page, features photos from the album and its
 * sub-albums, laid out as a horizontal carousel. Every card keeps the same
 * fixed size, and the previous/next buttons scroll it by about one card.
 */
export function GalleryGroupSection({
  album,
  canEdit = false,
  canDelete = false,
  canCreate = false,
  uploader,
  featuredImageLimit = 10,
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
  const saveInProgress = useRef(false)
  const editForm = useRef<AlbumFormHandle>(null)
  const createMediaForm = useRef<MediaFormHandle>(null)
  const editMediaForm = useRef<MediaFormHandle>(null)
  const [editingMedia, setEditingMedia] = useState<{
    media: GalleryMedia
    albumId: string
  } | null>(null)
  const fileCount = album.subAlbums.reduce(
    (total, subAlbum) => total + subAlbum.media.length,
    album.media.length,
  )
  const summaryParts = [t('files', { count: fileCount }), album.years]
  if (album.subAlbums.length > 0) {
    summaryParts.unshift(t('subalbums', { count: album.subAlbums.length }))
  }
  const summary = summaryParts.join(' · ')

  const trackRef = useRef<HTMLUListElement>(null)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])
  const [openIndex, setOpenIndex] = useState(closed)
  const featuredMedia = [
    ...album.media
      .filter((media) => !media.isVideo && media.src)
      .map((media) => ({ media, ownerSlug: album.slug, ownerId: album.id })),
    ...album.subAlbums.flatMap((subAlbum) =>
      subAlbum.media
        .filter((media) => !media.isVideo && media.src)
        .map((media) => ({
          media,
          ownerSlug: subAlbum.slug,
          ownerId: subAlbum.id,
        })),
    ),
  ].slice(0, featuredImageLimit)
  const albumId = album.id
  const showAddCard = editMode && canCreate && albumId !== undefined && uploader !== undefined
  const canDeleteItem = editMode && canDelete

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    track.scrollLeft = 0
    const frame = requestAnimationFrame(() => {
      track.scrollLeft = 0
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  function scrollByCards(direction: 1 | -1): void {
    const track = trackRef.current
    if (!track) return

    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.2) })
  }

  const closeLightbox = useCallback((): void => {
    triggers.current[openIndex]?.focus()
    setOpenIndex(closed)
  }, [openIndex])

  const showPreviousImage = useCallback((): void => {
    setOpenIndex((current) => (current - 1 + featuredMedia.length) % featuredMedia.length)
  }, [featuredMedia.length])

  const showNextImage = useCallback((): void => {
    setOpenIndex((current) => (current + 1) % featuredMedia.length)
  }, [featuredMedia.length])

  const openMedia: GalleryMedia | null =
    openIndex === closed ? null : (featuredMedia[openIndex]?.media ?? null)

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

  async function handleDeleteMedia(mediaId: string): Promise<void> {
    await sendWithFeedback(
      `/api/gallery/media/${mediaId}`,
      { method: 'DELETE' },
      {
        success: tFeedback('fileDeleted'),
        fallback: tFeedback('fileDeleteFailed'),
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

  return (
    <section aria-labelledby={headingId} className="gallery-group">
      <div className="gallery-group-heading">
        {editMode && (canEdit || canDelete) ? (
          <EditableWrapper
            className="gallery-group-title-editable"
            deleteConfirmTitle={tActions('deleteAlbum')}
            deleteConfirmMessage={tActions('deleteMessage', { title: album.title })}
            deleteLabel={tActions('deleteItem', { title: album.title })}
            editLabel={tActions('editItem', { title: album.title })}
            onDelete={canDelete ? () => handleDelete(album, false) : undefined}
            onEdit={canEdit ? () => handleUpdate() : undefined}
          >
            <h2 id={headingId}>{album.title}</h2>
          </EditableWrapper>
        ) : (
          <h2 id={headingId}>{album.title}</h2>
        )}
      </div>
      <p className="gallery-group-description">{album.description}</p>
      <span className="gallery-group-meta">{summary}</span>

      <ul
        aria-label={album.title}
        className="gallery-carousel-track tile-list"
        ref={trackRef}
        tabIndex={0}
      >
        {showAddCard ? (
          <li>
            <AddItemCard
              label={tActions('addFile')}
              onRequestClose={(close) => {
                if (createMediaForm.current) createMediaForm.current.requestCancel()
                else close()
              }}
              size="large"
            >
              {({ close }) => (
                <MediaForm
                  ref={createMediaForm}
                  albumId={albumId}
                  onCancel={close}
                  onSaved={() => {
                    close()
                    router.refresh()
                  }}
                  uploader={uploader}
                />
              )}
            </AddItemCard>
          </li>
        ) : null}
        {featuredMedia.map(({ media, ownerSlug, ownerId }, index) => {
          const trigger = (
            <button
              aria-label={tActions('viewImageFullSize', { title: media.title })}
              className="gallery-carousel-image-button"
              onClick={() => setOpenIndex(index)}
              ref={(element) => {
                triggers.current[index] = element
              }}
              type="button"
            >
              <MediaFrame
                alt=""
                className="gallery-tile-media"
                placeholder={media.title}
                sizes="(max-width: 600px) 80vw, 260px"
                src={media.src}
              />
            </button>
          )
          const canEditItem = editMode && canEdit && ownerId !== undefined

          return (
            <li key={`${ownerSlug}-${media.id}`}>
              {canEditItem || canDeleteItem ? (
                <EditableWrapper
                  className="gallery-carousel-media-editable"
                  deleteLabel={tActions('deleteItem', { title: media.title })}
                  deleteConfirmTitle={tActions('deleteFile')}
                  deleteConfirmMessage={tActions('deleteMessage', { title: media.title })}
                  editLabel={tActions('editItem', { title: media.title })}
                  onDelete={canDeleteItem ? () => handleDeleteMedia(media.id) : undefined}
                  onEdit={
                    canEditItem && ownerId
                      ? () => setEditingMedia({ media, albumId: ownerId })
                      : undefined
                  }
                >
                  {trigger}
                </EditableWrapper>
              ) : (
                trigger
              )}
            </li>
          )
        })}
      </ul>
      <div className="team-gallery-controls">
        {featuredMedia.length > 0 ? (
          <>
            <button
              aria-label={tActions('carouselPrevious')}
              className="team-gallery-control"
              onClick={() => scrollByCards(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
            </button>
            <button
              aria-label={tActions('carouselNext')}
              className="team-gallery-control"
              onClick={() => scrollByCards(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
            </button>
          </>
        ) : null}
        <Button href={albumPath(album.slug)} variant="primary">
          {tActions('viewAlbum')}
        </Button>
      </div>

      {openMedia ? (
        <MediaLightbox
          albumTitle={album.title}
          item={openMedia}
          onClose={closeLightbox}
          onNext={showNextImage}
          onPrevious={showPreviousImage}
          position={openIndex + 1}
          total={featuredMedia.length}
        />
      ) : null}

      <Modal
        onClose={() => {
          if (editMediaForm.current) editMediaForm.current.requestCancel()
          else setEditingMedia(null)
        }}
        open={editingMedia !== null}
        size="large"
        title={tActions('editFile')}
      >
        {editingMedia ? (
          <MediaForm
            ref={editMediaForm}
            albumId={editingMedia.albumId}
            media={{
              id: editingMedia.media.id,
              title: editingMedia.media.title,
              description: editingMedia.media.description,
              alt: editingMedia.media.alt,
              date: editingMedia.media.date,
              colSpan: String(editingMedia.media.colSpan),
              rowSpan: String(editingMedia.media.rowSpan),
              src: editingMedia.media.src,
              format: editingMedia.media.format,
            }}
            stored={editingMedia.media.editing?.content ?? null}
            version={editingMedia.media.editing?.version}
            isLegacy={editingMedia.media.editing?.isLegacy}
            onCancel={() => setEditingMedia(null)}
            onSaved={() => {
              setEditingMedia(null)
              router.refresh()
            }}
            uploader={editingMedia.media.uploader}
          />
        ) : null}
      </Modal>

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
