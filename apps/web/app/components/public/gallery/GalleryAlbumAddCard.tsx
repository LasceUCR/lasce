'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import {
  AlbumForm,
  type AlbumFormHandle,
  type AlbumFormValues,
} from '@/app/components/public/gallery/forms/AlbumForm'

export interface GalleryAlbumAddCardProps {
  canCreate?: boolean
}

const blankAlbum: AlbumFormValues = {
  title: '',
  description: '',
  yearsLabel: '',
  coverObjectKey: '',
}

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
  const toast = useToast()
  const sendWithFeedback = useRequestFeedback()
  const [isCreating, setIsCreating] = useState(false)
  const createInProgress = useRef(false)
  const createForm = useRef<AlbumFormHandle>(null)

  if (!editMode || !canCreate) return null

  async function handleCreate(values: AlbumFormValues, close: () => void) {
    if (createInProgress.current) return

    const slug = slugFromTitle(values.title)
    if (!slug) {
      toast.show(
        'error',
        'El título debe incluir letras o números para generar el identificador del álbum.',
      )
      return
    }

    createInProgress.current = true
    setIsCreating(true)

    try {
      await sendWithFeedback(
        '/api/gallery/albums',
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
          success: 'Álbum agregado correctamente.',
          fallback: 'No se pudo crear el álbum.',
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

  return (
    <ul className="gallery-grid tile-list">
      <li className="gallery-grid-add">
        <AddItemCard
          label="Añadir álbum"
          onRequestClose={(close) => {
            if (createForm.current) createForm.current.requestCancel()
            else close()
          }}
          size="large"
        >
          {({ close }) => (
            <>
              {isCreating ? <p role="status">Creando álbum...</p> : null}
              <AlbumForm
                album={blankAlbum}
                onCancel={close}
                onSave={(values) => handleCreate(values, close)}
                ref={createForm}
              />
            </>
          )}
        </AddItemCard>
      </li>
    </ul>
  )
}
