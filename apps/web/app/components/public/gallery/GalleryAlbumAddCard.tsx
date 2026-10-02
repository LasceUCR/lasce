'use client'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

export interface GalleryAlbumAddCardProps {
  canCreate?: boolean
}

export function GalleryAlbumAddCard({ canCreate = false }: GalleryAlbumAddCardProps) {
  const { editMode } = useEditMode()

  if (!editMode || !canCreate) return null

  return (
    <ul className="gallery-grid tile-list">
      <li className="gallery-grid-add">
        <AddItemCard label="Añadir álbum">
          {({ close }) => (
            <button onClick={close} type="button">
              Crear álbum
            </button>
          )}
        </AddItemCard>
      </li>
    </ul>
  )
}
