'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { slugFromTitle } from '@/app/lib/gallery-schema'
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

export function GalleryAlbumAddCard({ canCreate = false }: GalleryAlbumAddCardProps) {
  const { editMode } = useEditMode()
  const router = useRouter()
  const t = useTranslations('gallery.feedback')
  const tActions = useTranslations('gallery.actions')
  const sendWithFeedback = useRequestFeedback()
  const [isCreating, setIsCreating] = useState(false)
  const createInProgress = useRef(false)
  const createForm = useRef<AlbumFormHandle>(null)

  if (!editMode || !canCreate) return null

  async function handleCreate(values: AlbumFormValues, close: () => void) {
    if (createInProgress.current) return

    const slug = slugFromTitle(values.title)
    if (!slug) return

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
          success: t('albumCreated'),
          fallback: t('albumCreateFailed'),
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
    <AddItemCard
      label={tActions('addAlbum')}
      onRequestClose={(close) => {
        if (createForm.current) createForm.current.requestCancel()
        else close()
      }}
      size="large"
    >
      {({ close }) => (
        <>
          {isCreating ? <p role="status">{tActions('creatingAlbum')}</p> : null}
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
  )
}
