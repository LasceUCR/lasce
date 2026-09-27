'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import {
  uploadResearcherImage,
  type UploadResearcherImageResult,
} from '@/app/(public)/radioastronomia/actions'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

/**
 * The shape this form needs from a person record — deliberately not imported
 * from `@/app/lib/rosac` or `@/app/lib/nosotros`, so the same form (and
 * `EditableResearcherCard`) can edit either the ROSAC team or the Nosotros
 * roster without either page's content module depending on the other.
 */
export interface PersonProfile {
  src: string
  role: string
  name: string
  email?: string
  institution: string
  description?: string
}

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
  researcher: PersonProfile | null
  onSave: (values: ResearcherFormValues) => void
  onCancel: () => void
  /** Overrides the confirmation dialog's copy — a new researcher reads oddly as "save changes". */
  confirmTitle?: string
  confirmMessage?: string
  /**
   * ROSAC researchers always need a bio (`rosac.ts`'s `researcherInputSchema`
   * requires it); Nosotros researchers don't (`nosotrosResearcherInputSchema`
   * allows an empty one — several current profiles have no bio at all).
   * Defaults to `true` so existing ROSAC callers keep their current behavior.
   */
  descriptionRequired?: boolean
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
  descriptionRequired = true,
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
  const uploadErrorRef = useRef<HTMLParagraphElement>(null)

  // Scrolls the error into view as soon as it appears — the modal this form
  // usually sits in can be taller than the viewport, and a message added
  // below the last field is otherwise easy to miss without scrolling down.
  useEffect(() => {
    if (uploadError) {
      scrollIntoViewIfSupported(uploadErrorRef.current)
    }
  }, [uploadError])

  const hasPhoto = photoFile !== null || (Boolean(researcher?.src) && !photoRemoved)
  const canSave =
    role.trim() !== '' &&
    name.trim() !== '' &&
    institution.trim() !== '' &&
    (!descriptionRequired || description.trim() !== '') &&
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
        required={descriptionRequired}
        value={description}
      />

      {uploadError ? (
        <p className="form-alert" ref={uploadErrorRef} role="alert">
          {uploadError}
        </p>
      ) : null}

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
