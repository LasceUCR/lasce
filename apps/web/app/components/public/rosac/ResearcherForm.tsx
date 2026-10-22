'use client'

import { X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/app/components/public/Button'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { IconButton } from '@/app/components/public/IconButton'
import {
  uploadResearcherImage,
  type UploadResearcherImageResult,
} from '@/app/(public)/radioastronomia/actions'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import type {
  NosotrosResearcherContentInput,
  NosotrosResearcherEditingData,
  NosotrosResearcherField,
} from '@/app/lib/nosotros-researcher-schema'

import { ResearcherContentFields, type ResearcherContentHandle } from './ResearcherContentFields'

/**
 * The shape this form needs from a person record — deliberately not imported
 * from `@/app/lib/rosac` or `@/app/lib/nosotros`, so the same form (and
 * `EditableResearcherCard`) can edit either the ROSAC team or the Nosotros
 * roster without either page's content module depending on the other.
 */
export interface PersonProfile {
  /** `''` means the researcher has no photo. */
  src: string
  role: string
  name: string
  /** Zero, one or two public addresses — edited as chips, the same way publication authors are. */
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
  /** The photo's permanent URL — already uploaded by the time `onSave` runs. `''` means no
   * photo: the photo is optional, and the card shows a default portrait instead. */
  src: string
}

/**
 * What `onSave` receives in the bilingual mode (`translation`): the shared fields, and the role
 * and description of both languages in `content` instead of `role` and `description`.
 */
export interface BilingualResearcherFormValues {
  name: string
  /** `''` means no public address — same as an untouched row. */
  email: string
  institution: string
  /** The photo's permanent URL — already uploaded by the time `onSave` runs. `''` means no
   * photo. */
  src: string
  /**
   * Both languages in full, or `null` when no role or description changed, so the shared fields
   * of a legacy researcher can be saved without translating it.
   */
  content: NosotrosResearcherContentInput | null
  /** The one-sided changes the editor reviewed and kept; only meaningful with `content`. */
  confirmedUnchanged: ReviewConfirmation<NosotrosResearcherField>[]
}

interface ResearcherFormBaseProps {
  /** `null` starts a blank form for a new researcher. */
  researcher: PersonProfile | null
  onCancel: () => void
}

/** What turns the bilingual mode on. */
export interface ResearcherFormTranslation {
  /**
   * `editing` of the researcher being edited: its text in both languages and the version to save
   * against. `null` when creating one.
   */
  editing: NosotrosResearcherEditingData | null
}

/** The single-language form (ROSAC): one role and one description. */
export interface SingleLanguageResearcherFormProps extends ResearcherFormBaseProps {
  translation?: undefined
  onSave: (values: ResearcherFormValues) => void
}

/**
 * The opt-in bilingual form (`/nosotros`): the role and the description sit in one tab per
 * language. It needs the site's language, so it is the only mode that reads the message
 * catalogue.
 */
export interface BilingualResearcherFormProps extends ResearcherFormBaseProps {
  translation: ResearcherFormTranslation
  onSave: (values: BilingualResearcherFormValues) => void
}

export type ResearcherFormProps = SingleLanguageResearcherFormProps | BilingualResearcherFormProps

/** Messages match `researcherInputSchema` / `nosotrosResearcherInputSchema`
 * so a rejection reads the same whether it's caught here or by the server. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

/** Same wording `ResearchAreaForm` uses when an image upload cannot reach the server. */
const UPLOAD_ERROR_MESSAGE = 'No se pudo subir la imagen. Inténtelo de nuevo.'

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
 * pre-filled for an existing one. "Confirmar" is the save action itself: creating and editing
 * save straight away, with no second confirmation dialog.
 *
 * Passing `translation` switches to the bilingual mode used by `/nosotros`: the role and the
 * description are edited per language (`ResearcherContentFields`) and `onSave` receives them as
 * `content`. Without it nothing changes, which is how `/radioastronomia` keeps using the form.
 *
 * The photo uploads to the real asset store through `uploadResearcherImage`
 * (the same `assetStorage` MinIO backend `NewsArticleForm` already uses)
 * before `onSave` runs, so `onSave` always receives a permanent URL rather
 * than a local `File`.
 */
export function ResearcherForm(props: ResearcherFormProps) {
  const { researcher, onCancel } = props
  const bilingual = props.translation !== undefined
  const contentRef = useRef<ResearcherContentHandle>(null)
  const [role, setRole] = useState(researcher?.role ?? '')
  const [name, setName] = useState(researcher?.name ?? '')
  const emailFieldId = useId()
  const [emails, setEmails] = useState(parseEmails(researcher?.email))
  const [newEmail, setNewEmail] = useState('')
  const [newEmailError, setNewEmailError] = useState<string | null>(null)
  const [institution, setInstitution] = useState(researcher?.institution ?? '')
  const [description, setDescription] = useState(researcher?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const toast = useToast()
  // A failed upload is an action outcome, so it is reported with a toast (see "Feedback" in
  // `AGENTS.md`). The previous attempt's toast is dismissed on retry so errors do not pile up,
  // the same way `useRequestFeedback` handles the save request.
  const uploadErrorToast = useRef<number | null>(null)

  const roleError = hasAttemptedSubmit && role.trim() === '' ? 'El rol es obligatorio.' : null
  const nameError = hasAttemptedSubmit && name.trim() === '' ? 'El nombre es obligatorio.' : null
  const institutionError =
    hasAttemptedSubmit && institution.trim() === '' ? 'La institución es obligatoria.' : null

  const initialEmails = parseEmails(researcher?.email)
  const emailsChanged =
    emails.length !== initialEmails.length ||
    emails.some((address, index) => address !== initialEmails[index])
  // In the bilingual mode the role and the description are tracked by the content fields, which
  // are only asked from an event handler.
  function isDirty() {
    const textChanged = bilingual
      ? (contentRef.current?.isDirty() ?? false)
      : role !== (researcher?.role ?? '') || description !== (researcher?.description ?? '')

    return (
      name !== (researcher?.name ?? '') ||
      institution !== (researcher?.institution ?? '') ||
      textChanged ||
      emailsChanged ||
      newEmail.trim() !== '' ||
      photoFile !== null ||
      photoRemoved
    )
  }

  function handleCancelClick() {
    if (isDirty()) {
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
    const roleMissing = !bilingual && role.trim() === ''
    const sharedValid = !roleMissing && name.trim() !== '' && institution.trim() !== ''
    // The tabs open the language that has an error; they only take the focus when nothing shared
    // above them is wrong.
    const contentValid = bilingual
      ? (contentRef.current?.validate({ focus: sharedValid }) ?? true)
      : true
    if (!sharedValid || !contentValid) {
      if (roleMissing) {
        document.getElementById('researcher-role')?.focus()
      } else if (name.trim() === '') {
        document.getElementById('researcher-name')?.focus()
      } else if (institution.trim() === '') {
        document.getElementById('researcher-institution')?.focus()
      }
      return
    }

    void handleConfirm()
  }

  async function handleConfirm() {
    if (uploadErrorToast.current !== null) {
      toast.dismiss(uploadErrorToast.current)
      uploadErrorToast.current = null
    }

    // An untouched photo is kept as is; a removed one is saved as `''`, which means no photo.
    let src = photoRemoved ? '' : (researcher?.src ?? '')
    if (photoFile) {
      setIsUploading(true)

      let result: UploadResearcherImageResult
      try {
        const formData = new FormData()
        formData.set('file', photoFile)
        result = await uploadResearcherImage(formData)
      } catch {
        setIsUploading(false)
        uploadErrorToast.current = toast.show('error', UPLOAD_ERROR_MESSAGE)
        return
      }
      setIsUploading(false)

      if (!result.ok) {
        uploadErrorToast.current = toast.show('error', result.error)
        return
      }
      src = result.imageUrl
    }

    if (props.translation) {
      const { content, confirmedUnchanged } = contentRef.current?.result() ?? {
        content: null,
        confirmedUnchanged: [],
      }
      props.onSave({
        name,
        email: emails.join(', '),
        institution,
        src,
        content,
        confirmedUnchanged,
      })
      return
    }

    props.onSave({ role, name, email: emails.join(', '), institution, description, src })
  }

  function addEmail() {
    const trimmed = newEmail.trim()
    if (emails.length >= MAX_EMAILS) {
      setNewEmailError(`Máximo ${MAX_EMAILS} correos de contacto.`)
      return
    }
    if (trimmed === '') {
      setNewEmailError('El correo es obligatorio.')
      return
    }
    if (!isValidEmail(trimmed)) {
      setNewEmailError('El correo no es válido.')
      return
    }
    if (emails.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setNewEmailError('Ese correo ya fue agregado.')
      return
    }

    setEmails([...emails, trimmed])
    setNewEmail('')
    setNewEmailError(null)
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addEmail()
  }

  function handleRemoveEmail(address: string) {
    setEmails(emails.filter((existing) => existing !== address))
  }

  return (
    <div className="cms-form">
      <FileDropInput
        existingImageUrl={researcher?.src || undefined}
        helperText="Opcional. Retrato del investigador, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
      />

      {bilingual ? null : (
        <FormField
          errorMessage={roleError}
          id="researcher-role"
          label="Rol"
          onChange={setRole}
          required
          validate={requireNonEmpty('El rol es obligatorio.')}
          value={role}
        />
      )}

      <FormField
        errorMessage={nameError}
        id="researcher-name"
        label="Nombre"
        onChange={setName}
        required
        validate={requireNonEmpty('El nombre es obligatorio.')}
        value={name}
      />

      <div
        aria-labelledby="researcher-email-label"
        className="cms-form-field publication-authors"
        role="group"
      >
        <div className="publication-authors-header">
          <span className="cms-form-field-label" id="researcher-email-label">
            Contacto
          </span>
          <span aria-live="polite" className="publication-authors-count">
            {emails.length === 0
              ? 'Sin correos'
              : emails.length === 1
                ? '1 correo'
                : `${emails.length} correos`}
          </span>
        </div>
        <div
          className={
            newEmailError ? 'publication-authors-box is-invalid' : 'publication-authors-box'
          }
        >
          {emails.length > 0 ? (
            <ul aria-label="Correos de contacto" className="publication-authors-list">
              {emails.map((address) => (
                <li className="email-chip" key={address}>
                  {address}
                  <IconButton
                    className="email-chip-remove"
                    icon={<X size={12} strokeWidth={2} />}
                    label={`Eliminar ${address}`}
                    onClick={() => handleRemoveEmail(address)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <div className="publication-authors-entry">
            <input
              aria-describedby={newEmailError ? emailFieldId : undefined}
              aria-invalid={newEmailError ? true : undefined}
              aria-label="Correo electrónico"
              disabled={emails.length >= MAX_EMAILS}
              onChange={(event) => {
                setNewEmail(event.target.value)
                setNewEmailError(null)
              }}
              onKeyDown={handleEmailKeyDown}
              placeholder={emails.length > 0 ? 'Escribir otro correo...' : 'Escribir un correo...'}
              type="email"
              value={newEmail}
            />
            <Button
              className="publication-authors-add"
              disabled={emails.length >= MAX_EMAILS}
              onClick={addEmail}
              variant="secondary"
            >
              Agregar
            </Button>
          </div>
        </div>
        {newEmailError ? (
          <p className="form-field-error" id={emailFieldId} role="alert">
            {newEmailError}
          </p>
        ) : null}
      </div>

      <FormField
        errorMessage={institutionError}
        id="researcher-institution"
        label="Institución"
        onChange={setInstitution}
        required
        validate={requireNonEmpty('La institución es obligatoria.')}
        value={institution}
      />

      {props.translation ? (
        <ResearcherContentFields editing={props.translation.editing} ref={contentRef} />
      ) : (
        <FormField
          id="researcher-description"
          label="Descripción"
          multiline
          onChange={setDescription}
          value={description}
        />
      )}

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? 'Subiendo imagen...' : 'Confirmar'}
        </Button>
      </div>

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
