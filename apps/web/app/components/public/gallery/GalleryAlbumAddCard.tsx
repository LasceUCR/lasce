'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { AlbumForm, type AlbumFormValues } from '@/app/components/public/gallery/forms/AlbumForm'

export interface GalleryAlbumAddCardProps {
  canCreate?: boolean
}

const blankAlbum: AlbumFormValues = {
  title: '',
  description: '',
  yearsLabel: '',
  coverObjectKey: '',
}

const SAVE_ERROR_MESSAGE = 'No se pudo crear el álbum. Inténtelo de nuevo.'

function slugFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function GalleryAlbumAddCard({ canCreate = false }: GalleryAlbumAddCardProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const createInProgress = useRef(false)

  if (!editMode || !canCreate) return null

  async function handleCreate(values: AlbumFormValues, close: () => void) {
    if (createInProgress.current) return

    const slug = slugFromTitle(values.title)
    if (!slug) {
      setCreateError(
        'El título debe incluir letras o números para generar el identificador del álbum.',
      )
      return
    }

    createInProgress.current = true
    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: values.title,
          description: values.description,
          yearsLabel: values.yearsLabel.trim() || null,
          coverObjectKey: values.coverObjectKey,
        }),
      })

      if (!response.ok) {
        const body: { error?: string } | null = await response.json().catch(() => null)
        setCreateError(body?.error ?? SAVE_ERROR_MESSAGE)
        return
      }

      close()
      router.refresh()
    } catch {
      setCreateError(SAVE_ERROR_MESSAGE)
    } finally {
      createInProgress.current = false
      setIsCreating(false)
    }
  }

  return (
    <ul className="gallery-grid tile-list">
      <li className="gallery-grid-add">
        <AddItemCard label="Añadir álbum">
          {({ close }) => (
            <>
              {createError ? (
                <p className="form-alert" role="alert">
                  {createError}
                </p>
              ) : null}
              {isCreating ? <p role="status">Creando álbum...</p> : null}
              <AlbumForm
                album={blankAlbum}
                onCancel={() => {
                  setCreateError(null)
                  close()
                }}
                onSave={(values) => handleCreate(values, close)}
              />
            </>
          )}
        </AddItemCard>
      </li>
    </ul>
  )
}
