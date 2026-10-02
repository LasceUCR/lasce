'use client'

import { AlbumMediaGrid } from './AlbumMediaGrid'
import { AlbumTile } from './AlbumTile'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import type { GalleryMedia, GallerySubAlbum } from '@/app/lib/gallery'

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
  canCreate = false,
  canEdit = false,
  canDelete = false,
  backHref = '/galeria',
  backLabel = 'Volver a la galería',
}: AlbumPageProps) {
  const { editMode } = useEditMode()

  function handleSave(): void {}

  function handleDelete(slug: string): void {}

  function handleCreate(): void {}

  function handleUpdate(slug: string): void {}

  const showEditor = editMode && (canEdit || canDelete)

  return (
    <article className="topic-page">
      <TopicHero kicker="Galería LASCE" lead={description} notice={meta} title={title} />

      {parentSlug && (subAlbums.length > 0 || (editMode && canCreate)) ? (
        <TopicSection title="Subálbumes" titleId="album-subalbums">
          <ul className="card-grid card-grid-3 tile-list gallery-subalbum-list">
            {editMode && canCreate ? (
              <li className="gallery-subalbum-add">
                <AddItemCard label="Añadir subálbum">
                  {({ close }) => (
                    <button
                      onClick={() => {
                        handleCreate()
                        close()
                      }}
                      type="button"
                    >
                      Crear subálbum
                    </button>
                  )}
                </AddItemCard>
              </li>
            ) : null}
            {subAlbums.map((subAlbum) => (
              <li key={subAlbum.slug}>
                {showEditor ? (
                  <EditableWrapper
                    deleteLabel={`Eliminar ${subAlbum.title}`}
                    deleteConfirmTitle="Eliminar subálbum"
                    deleteConfirmMessage={`¿Desea eliminar "${subAlbum.title}"? Esta acción no se puede deshacer.`}
                    editLabel={`Editar ${subAlbum.title}`}
                    onDelete={canDelete ? () => handleDelete(subAlbum.slug) : undefined}
                    onEdit={canEdit ? () => handleUpdate(subAlbum.slug) : undefined}
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
            ))}
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
        />
      </TopicSection>

      <div className="topic-page-footer gallery-album-footer page-width">
        <TopicBackLink href={backHref} label={backLabel} />
      </div>
    </article>
  )
}
