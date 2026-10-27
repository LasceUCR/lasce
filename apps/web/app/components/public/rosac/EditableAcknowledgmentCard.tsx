'use client'

import { Building2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

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
  canDelete?: boolean
  onSave: (values: RosacAcknowledgmentFormValues) => Promise<string | null> | void
  onDelete?: () => void
}

export function EditableAcknowledgmentCard({
  institution,
  canEdit = false,
  canDelete = false,
  onSave,
  onDelete,
}: EditableAcknowledgmentCardProps) {
  const t = useTranslations('rosac.editor')
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const logoContent = (
    <>
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
            <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>
              {t('acknowledgments.logoUnavailable')}
            </span>
          </div>
        )}
      </div>
      <span className="sr-only">{institution.name}</span>
    </>
  )

  const showEditor = editMode && (canEdit || canDelete)

  const card =
    !showEditor && institution.href ? (
      <a
        className="acknowledgments-card"
        href={institution.href}
        rel="noopener noreferrer"
        target="_blank"
        title={institution.name}
      >
        {logoContent}
      </a>
    ) : (
      <div
        className={`acknowledgments-card ${!showEditor && !institution.href ? 'acknowledgments-card-static' : ''}`.trim()}
        title={institution.name}
      >
        {logoContent}
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
      title={t('acknowledgments.editModalTitle')}
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

  if (!showEditor) {
    return card
  }

  return (
    <>
      <EditableWrapper
        deleteConfirmMessage={t('acknowledgments.deleteConfirmMessage', { name: institution.name })}
        deleteConfirmTitle={t('acknowledgments.deleteConfirmTitle')}
        deleteLabel={t('acknowledgments.deleteLabel', { name: institution.name })}
        editLabel={t('acknowledgments.editLabel', { name: institution.name })}
        onDelete={canDelete ? onDelete : undefined}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
