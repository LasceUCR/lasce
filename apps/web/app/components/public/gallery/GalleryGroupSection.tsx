'use client'

import { AlbumTile } from './AlbumTile'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { albumMeta, albumPath, subAlbumPath, type GalleryAlbum } from '@/app/lib/gallery'

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
  const headingId = `galeria-${album.slug}`

  function handleDelete(slug: string): void {}

  function handleCreate(): void {}

  function handleUpdate(slug: string): void {}

  const cover = (
    <AlbumTile
      href={albumPath(album.slug)}
      meta={albumMeta(album)}
      src={album.src}
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
        {editMode && canCreate ? (
          <li className="gallery-grid-add">
            <AddItemCard label="Añadir álbum">
              {({ close }) => (
                <button
                  onClick={() => {
                    handleCreate()
                    close()
                  }}
                  type="button"
                >
                  Crear álbum
                </button>
              )}
            </AddItemCard>
          </li>
        ) : null}
        <li>
          {editMode && (canEdit || canDelete) ? (
            <EditableWrapper
              className="gallery-grid-editable"
              deleteConfirmTitle="Eliminar álbum"
              deleteConfirmMessage={`¿Desea eliminar "${album.title}"? Esta acción no se puede deshacer.`}
              deleteLabel={`Eliminar ${album.title}`}
              editLabel={`Editar ${album.title}`}
              onDelete={canDelete ? () => handleDelete(album.slug) : undefined}
              onEdit={canEdit ? () => handleUpdate(album.slug) : undefined}
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
              src={subAlbum.src}
              title={subAlbum.title}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
