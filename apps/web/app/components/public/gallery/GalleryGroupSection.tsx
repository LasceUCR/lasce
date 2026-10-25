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
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'
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
  featuredImageLimit?: number
}

/**
 * One block of the gallery page, features photos from the album and its
 * sub-albums, laid out as a horizontal carousel. Every tile keeps the same
 * fixed size; the track scrollssideways, and * the previous/next buttons
 * scroll it by about one card.
 */
export function GalleryGroupSection({
  album,
  canEdit = false,
  canDelete = false,
  featuredImageLimit = 10,
}: GalleryGroupSectionProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const headingId = `galeria-${album.slug}`
  const [isEditing, setIsEditing] = useState(false)
  const [editingSubAlbum, setEditingSubAlbum] = useState<GallerySubAlbum | null>(null)
  const t = useTranslations('gallery.feedback')
  const tActions = useTranslations('gallery.actions')
  const sendWithFeedback = useRequestFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const saveInProgress = useRef(false)
  const editForm = useRef<AlbumFormHandle>(null)

  const trackRef = useRef<HTMLUListElement>(null)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])
  const [openIndex, setOpenIndex] = useState(closed)
  const featuredMedia = [
    ...album.media
      .filter((media) => !media.isVideo && media.src)
      .map((media) => ({ media, ownerSlug: album.slug })),
    ...album.subAlbums.flatMap((subAlbum) =>
      subAlbum.media
        .filter((media) => !media.isVideo && media.src)
        .map((media) => ({
          media,
          ownerSlug: subAlbum.slug,
        })),
    ),
  ].slice(0, featuredImageLimit)

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
        success: t(isSub ? 'subAlbumDeleted' : 'albumDeleted'),
        fallback: t(isSub ? 'subAlbumDeleteFailed' : 'albumDeleteFailed'),
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
          success: t(isSub ? 'subAlbumUpdated' : 'albumUpdated'),
          fallback: t(isSub ? 'subAlbumSaveFailed' : 'albumSaveFailed'),
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
      <span className="gallery-group-meta">{albumMeta(album)}</span>

      <ul
        aria-label={album.title}
        className="gallery-carousel-track tile-list"
        ref={trackRef}
        tabIndex={0}
      >
        {featuredMedia.map(({ media, ownerSlug }, index) => (
          <li key={`${ownerSlug}-${media.id}`}>
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
          </li>
        ))}
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
