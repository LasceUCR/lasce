'use client'

import { Building2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { RosacAcknowledgment } from '@/app/lib/rosac'

import {
  RosacAcknowledgmentForm,
  type RosacAcknowledgmentFormValues,
} from './RosacAcknowledgmentForm'

export interface EditableAcknowledgmentCardProps {
  institution: RosacAcknowledgment
  canEdit?: boolean
  onSave: (values: RosacAcknowledgmentFormValues) => Promise<string | null> | void
}

export function EditableAcknowledgmentCard({
  institution,
  canEdit = false,
  onSave,
}: EditableAcknowledgmentCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const card = (
    <div className="acknowledgments-card">
      <div className="acknowledgments-logo">
        {institution.logo.src && !imageFailed ? (
          <Image
            alt={institution.logo.alt}
            fill
            onError={() => setImageFailed(true)}
            sizes="160px"
            src={institution.logo.src}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: 'var(--muted)',
              gap: '6px',
            }}
          >
            <Building2 aria-hidden="true" size={36} strokeWidth={1.5} />
            <span style={{ fontSize: '0.75rem' }}>Logo no disponible</span>
          </div>
        )}
      </div>
      <p className="acknowledgments-name">{institution.name}</p>
    </div>
  )

  async function handleFormSave(values: RosacAcknowledgmentFormValues) {
    const error = await onSave(values)
    if (error) {
      setSaveError(error)
      return
    }
    setSaveError(null)
    setIsEditing(false)
  }

  const editModal = (
    <Modal
      onClose={() => {
        setSaveError(null)
        setIsEditing(false)
      }}
      open={isEditing}
      size="medium"
      title="Editar institución"
    >
      {saveError ? (
        <p className="form-alert" role="alert">
          {saveError}
        </p>
      ) : null}
      <RosacAcknowledgmentForm
        institution={institution}
        onCancel={() => {
          setSaveError(null)
          setIsEditing(false)
        }}
        onSave={handleFormSave}
      />
    </Modal>
  )

  const showEditor = editMode && canEdit

  if (!showEditor) {
    return card
  }

  return (
    <>
      <EditableWrapper
        editLabel={`Editar ${institution.name}`}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
