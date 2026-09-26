'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import {
  uploadResearcherImage,
  type UploadResearcherImageResult,
} from '@/app/(public)/radioastronomia/actions'
import type { TeamMember } from '@/app/lib/rosac'

export interface ResearcherFormValues {
  role: string
  name: string
  /** `''` means no public address — same as an untouched row. */
  email: string
  institution: string
  description: string
  /** The photo's permanent URL — already uploaded by the time `onSave` runs. */
  src: string
}

export interface ResearcherFormProps {
  /** `null` starts a blank form for a new researcher. */
  researcher: TeamMember | null
  onSave: (values: ResearcherFormValues) => void
  onCancel: () => void
  /** Overrides the confirmation dialog's copy — a new researcher reads oddly as "save changes". */
  confirmTitle?: string
  confirmMessage?: string
}

function validateEmail(value: string) {
  if (value.trim() === '') return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new Error('El correo no es válido.')
  }
}

/**
 * Creates or edits one ROSAC researcher profile (photo, role, name, contacto,
 * institución, descripción) — `researcher` is `null` for a new profile, or
 * pre-filled for an existing one. Saving asks for confirmation first, same as
 * `EditableWrapper`'s delete action.
 *
 * The photo uploads to the real asset store through `uploadResearcherImage`
 * (the same `assetStorage` MinIO backend `NewsArticleForm` already uses)
 * before `onSave` runs, so `onSave` always receives a permanent URL rather
 * than a local `File`.
 */
export function ResearcherForm({
  researcher,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en este investigador?',
}: ResearcherFormProps) {
  const [role, setRole] = useState(researcher?.role ?? '')
  const [name, setName] = useState(researcher?.name ?? '')
  const [email, setEmail] = useState(researcher?.email ?? '')
  const [institution, setInstitution] = useState(researcher?.institution ?? '')
  const [description, setDescription] = useState(researcher?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const hasPhoto = photoFile !== null || (Boolean(researcher?.src) && !photoRemoved)
  const canSave =
    role.trim() !== '' &&
    name.trim() !== '' &&
    institution.trim() !== '' &&
    description.trim() !== '' &&
    hasPhoto

  async function handleConfirm() {
    setConfirmOpen(false)
    setUploadError(null)

    let src = researcher?.src ?? ''
    if (photoFile) {
      setIsUploading(true)

      let result: UploadResearcherImageResult
      try {
        const formData = new FormData()
        formData.set('file', photoFile)
        result = await uploadResearcherImage(formData)
      } catch {
        setIsUploading(false)
        setUploadError('No se pudo subir la imagen. Inténtelo de nuevo.')
        return
      }
      setIsUploading(false)

      if (!result.ok) {
        setUploadError(result.error)
        return
      }
      src = result.imageUrl
    }

    onSave({ role, name, email, institution, description, src })
  }

  return (
    <div className="cms-form">
      <FileDropInput
        existingImageUrl={researcher?.src}
        helperText="Retrato del investigador, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
      />

      <FormField id="researcher-role" label="Rol" onChange={setRole} required value={role} />

      <FormField id="researcher-name" label="Nombre" onChange={setName} required value={name} />

      <FormField
        id="researcher-email"
        label="Contacto"
        onChange={setEmail}
        type="email"
        validate={validateEmail}
        value={email}
      />

      <FormField
        id="researcher-institution"
        label="Institución"
        onChange={setInstitution}
        required
        value={institution}
      />

      <FormField
        id="researcher-description"
        label="Descripción"
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      {uploadError ? <p className="form-alert">{uploadError}</p> : null}

      <div className="cms-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button
          disabled={!canSave || isUploading}
          onClick={() => setConfirmOpen(true)}
          variant="primary"
        >
          {isUploading ? 'Subiendo imagen...' : 'Confirmar'}
        </Button>
      </div>

      <ConfirmDialog
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
