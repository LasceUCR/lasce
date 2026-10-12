'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { IconButton } from '@/app/components/public/IconButton'
import { Modal } from '@/app/components/public/Modal'
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
  /** Zero, one or two public addresses — edited here as chips, each with its own "quitar". */
  email?: string | readonly string[]
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
}

/** Messages match `researcherInputSchema` / `nosotrosResearcherInputSchema`
 * so a rejection reads the same whether it's caught here or by the server. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

/** Matches the database CHECK constraint on both `researchers.email` and
 * `nosotros_researchers.email` — never send more than this many. */
const MAX_EMAILS = 2

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Normalizes `PersonProfile.email` to a plain array of addresses, whichever
 * shape the record was given in. */
function parseEmails(email: PersonProfile['email']): string[] {
  if (!email) return []
  return typeof email === 'string' ? [email] : [...email]
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
  const [emails, setEmails] = useState(parseEmails(researcher?.email))
  const [isAddingEmail, setIsAddingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newEmailError, setNewEmailError] = useState<string | null>(null)
  const [institution, setInstitution] = useState(researcher?.institution ?? '')
  const [description, setDescription] = useState(researcher?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadErrorRef = useRef<HTMLParagraphElement>(null)

  // Scrolls the upload error into view as soon as it appears — the modal this
  // form usually sits in can be taller than the viewport, and a message added
  // below the last field is otherwise easy to miss without scrolling down.
  useEffect(() => {
    if (uploadError) {
      scrollIntoViewIfSupported(uploadErrorRef.current)
    }
  }, [uploadError])

  const hasPhoto = photoFile !== null || (Boolean(researcher?.src) && !photoRemoved)
  const photoError = hasAttemptedSubmit && !hasPhoto ? 'La foto es obligatoria.' : null
  const roleError = hasAttemptedSubmit && role.trim() === '' ? 'El rol es obligatorio.' : null
  const nameError = hasAttemptedSubmit && name.trim() === '' ? 'El nombre es obligatorio.' : null
  const institutionError =
    hasAttemptedSubmit && institution.trim() === '' ? 'La institución es obligatoria.' : null

  const initialEmails = parseEmails(researcher?.email)
  const emailsChanged =
    emails.length !== initialEmails.length ||
    emails.some((address, index) => address !== initialEmails[index])
  const isDirty =
    role !== (researcher?.role ?? '') ||
    name !== (researcher?.name ?? '') ||
    institution !== (researcher?.institution ?? '') ||
    description !== (researcher?.description ?? '') ||
    emailsChanged ||
    newEmail.trim() !== '' ||
    photoFile !== null ||
    photoRemoved

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  // Field errors appear once "Confirmar" is pressed, then clear on their own
  // as each field becomes valid — same as the news article form.
  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (!hasPhoto || role.trim() === '' || name.trim() === '' || institution.trim() === '') {
      if (role.trim() === '') {
        document.getElementById('researcher-role')?.focus()
      } else if (name.trim() === '') {
        document.getElementById('researcher-name')?.focus()
      } else if (institution.trim() === '') {
        document.getElementById('researcher-institution')?.focus()
      }
      return
    }

    setConfirmOpen(true)
  }

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

    onSave({ role, name, email: emails.join(', '), institution, description, src })
  }

  function openAddEmail() {
    setNewEmail('')
    setNewEmailError(null)
    setIsAddingEmail(true)
  }

  function closeAddEmail() {
    setIsAddingEmail(false)
  }

  function handleAddEmail() {
    const trimmed = newEmail.trim()
    if (emails.length >= MAX_EMAILS) {
      setNewEmailError(`Máximo ${MAX_EMAILS} correos de contacto.`)
      return
    }
    if (!isValidEmail(trimmed)) {
      setNewEmailError('El correo no es válido.')
      return
    }
    if (emails.includes(trimmed)) {
      setNewEmailError('Ese correo ya fue agregado.')
      return
    }

    setEmails([...emails, trimmed])
    closeAddEmail()
  }

  function handleRemoveEmail(address: string) {
    setEmails(emails.filter((existing) => existing !== address))
  }

  return (
    <div className="cms-form">
      <FileDropInput
        errorMessage={photoError}
        existingImageUrl={researcher?.src}
        helperText="Retrato del investigador, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
        required
      />

      <FormField
        errorMessage={roleError}
        id="researcher-role"
        label="Rol"
        onChange={setRole}
        required
        validate={requireNonEmpty('El rol es obligatorio.')}
        value={role}
      />

      <FormField
        errorMessage={nameError}
        id="researcher-name"
        label="Nombre"
        onChange={setName}
        required
        validate={requireNonEmpty('El nombre es obligatorio.')}
        value={name}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label" id="researcher-email-label">
          Contacto
        </span>
        <div aria-labelledby="researcher-email-label" className="email-chip-field" role="group">
          {emails.map((address) => (
            <span className="email-chip" key={address}>
              {address}
              <IconButton
                className="email-chip-remove"
                icon={<X size={12} strokeWidth={2} />}
                label={`Eliminar ${address}`}
                onClick={() => handleRemoveEmail(address)}
              />
            </span>
          ))}
          {emails.length < MAX_EMAILS ? (
            <IconButton
              className="email-chip-add"
              icon={<Plus size={14} strokeWidth={2} />}
              label="Añadir contacto"
              onClick={openAddEmail}
            />
          ) : null}
        </div>
      </div>

      <Modal onClose={closeAddEmail} open={isAddingEmail} size="small" title="Añadir contacto">
        <FormField
          id="new-researcher-email"
          label="Correo electrónico"
          onChange={(value) => {
            setNewEmail(value)
            setNewEmailError(null)
          }}
          type="email"
          value={newEmail}
        />
        {newEmailError ? (
          <p className="form-alert" role="alert">
            {newEmailError}
          </p>
        ) : null}
        <div className="cms-form-actions">
          <Button onClick={closeAddEmail} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={newEmail.trim() === ''} onClick={handleAddEmail} variant="primary">
            Añadir
          </Button>
        </div>
      </Modal>

      <FormField
        errorMessage={institutionError}
        id="researcher-institution"
        label="Institución"
        onChange={setInstitution}
        required
        validate={requireNonEmpty('La institución es obligatoria.')}
        value={institution}
      />

      <FormField
        id="researcher-description"
        label="Descripción"
        multiline
        onChange={setDescription}
        value={description}
      />

      {uploadError ? (
        <p className="form-alert" ref={uploadErrorRef} role="alert">
          {uploadError}
        </p>
      ) : null}

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
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

      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
