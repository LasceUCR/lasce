'use client'

import { Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { MediaFrame } from './MediaFrame'
import { MediaLightbox } from './MediaLightbox'
import { Modal } from '@/app/components/public/Modal'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { MediaForm } from '@/app/components/public/gallery/forms/MediaForm'
import type { GalleryMedia } from '@/app/lib/gallery-schema'

function mediaPlaceholder(item: GalleryMedia): string {
  return `${item.isVideo ? 'Video' : 'Foto'}: ${item.title}`
}

export interface AlbumMediaGridProps {
  albumTitle: string
  media: readonly GalleryMedia[]
  editMode?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
  /** Database id of the album the media belongs to. Required to add files. */
  albumId?: string
  /** Name of the signed-in user, recorded as the uploader of new files. */
  uploader?: string
}

const closed = -1

/**
 * The album's masonry grid. Owns the lightbox index, so the grid and the dialog
 * agree on which file is open and focus can return to the tile that opened it.
 */
export function AlbumMediaGrid({
  albumTitle,
  media,
  editMode = false,
  canEdit = false,
  canDelete = false,
  canCreate = false,
  albumId,
  uploader,
}: AlbumMediaGridProps) {
  const router = useRouter()
  const sendWithFeedback = useRequestFeedback()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState(closed)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])
  const showEditor = editMode && (canEdit || canDelete || canCreate)
  const showAddCard = editMode && canCreate && albumId !== undefined && uploader !== undefined

  async function handleDelete(id: string): Promise<void> {
    await sendWithFeedback(
      `/api/gallery/media/${id}`,
      { method: 'DELETE' },
      {
        success: 'Archivo eliminado correctamente.',
        fallback: 'No se pudo eliminar el archivo.',
        onSuccess: () => router.refresh(),
      },
    )
  }

  const editingItem = editingId === null ? null : media.find((item) => item.id === editingId)

  const close = useCallback(() => {
    // The dialog closes itself natively before this runs, so the document is no
    // longer inert and the tile can take focus back.
    triggers.current[openIndex]?.focus()
    setOpenIndex(closed)
  }, [openIndex])

  const showPrevious = useCallback(() => {
    setOpenIndex((current) => (current - 1 + media.length) % media.length)
  }, [media.length])

  const showNext = useCallback(() => {
    setOpenIndex((current) => (current + 1) % media.length)
  }, [media.length])

  const openItem = openIndex === closed ? null : media[openIndex]

  return (
    <>
      <ul className="media-grid tile-list">
        {showAddCard ? (
          <li className="media-grid-add">
            <AddItemCard label="Añadir archivo">
              {({ close }) => (
                <MediaForm
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
        {media.map((item, index) => {
          const span = {
            '--media-col-span': item.colSpan,
            '--media-row-span': item.rowSpan,
          } as CSSProperties
          const frame = (
            <MediaFrame
              alt=""
              className="media-tile-frame"
              placeholder={mediaPlaceholder(item)}
              src={item.src}
            />
          )

          return (
            <li className="media-tile" key={item.id} style={span}>
              {/* Decorative: the button below names the file, and the caption
                  repeats it as real text. The photograph's own description
                  belongs to the lightbox, where the image is the content. */}
              {showEditor ? (
                <EditableWrapper
                  className="media-tile-editable"
                  deleteLabel={`Eliminar ${item.title}`}
                  deleteConfirmTitle="Eliminar archivo"
                  deleteConfirmMessage={`¿Desea eliminar "${item.title}"? Esta acción no se puede deshacer.`}
                  editLabel={`Editar ${item.title}`}
                  onDelete={canDelete ? () => handleDelete(item.id) : undefined}
                  onEdit={canEdit ? () => setEditingId(item.id) : undefined}
                >
                  {frame}
                </EditableWrapper>
              ) : (
                frame
              )}

              <button
                aria-label={`Ver a tamaño completo: ${item.title}`}
                className="media-tile-button"
                onClick={() => setOpenIndex(index)}
                ref={(element) => {
                  triggers.current[index] = element
                }}
                type="button"
              />

              {item.isVideo ? (
                <span className="play-badge">
                  <Play aria-hidden="true" size={16} strokeWidth={1.8} />
                  <span className="sr-only">Video</span>
                </span>
              ) : null}

              <div className="media-overlay">
                <span className="media-chip">{`${item.date} · ${item.format}`}</span>
              </div>

              {/* Not a `figcaption`: this panel is `opacity: 0` until the tile
                  is hovered or focused, so it is a reveal rather than a caption
                  the image always carries. */}
              <div className="media-hover">
                <p className="media-hover-title">{item.title}</p>
                <span className="media-hover-description">{item.description}</span>
                <span className="media-hover-meta">
                  {`${item.date} · ${item.format} · ${item.uploader}`}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <Modal
        onClose={() => setEditingId(null)}
        open={editingItem !== null && editingItem !== undefined}
        title="Editar archivo"
      >
        {editingItem && albumId !== undefined ? (
          <MediaForm
            albumId={albumId}
            media={{
              id: editingItem.id,
              title: editingItem.title,
              description: editingItem.description,
              alt: editingItem.alt,
              date: editingItem.date,
              colSpan: String(editingItem.colSpan),
              rowSpan: String(editingItem.rowSpan),
              src: editingItem.src,
              format: editingItem.format,
            }}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null)
              router.refresh()
            }}
            uploader={uploader ?? ''}
          />
        ) : null}
      </Modal>

      {openItem ? (
        <MediaLightbox
          albumTitle={albumTitle}
          item={openItem}
          onClose={close}
          onNext={showNext}
          onPrevious={showPrevious}
          position={openIndex + 1}
          total={media.length}
        />
      ) : null}
    </>
  )
}
