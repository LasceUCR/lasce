'use client'

import { X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'

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

export function ResearcherForm(props: ResearcherFormProps) {
  const { researcher, onCancel } = props
  const t = useTranslations('researchers')
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

  const roleError = hasAttemptedSubmit && role.trim() === '' ? t('editor.roleRequired') : null
  const nameError = hasAttemptedSubmit && name.trim() === '' ? t('editor.nameRequired') : null
  const institutionError =
    hasAttemptedSubmit && institution.trim() === '' ? t('editor.institutionRequired') : null

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
        uploadErrorToast.current = toast.show('error', t('editor.uploadError'))
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
      setNewEmailError(t('editor.maxEmails'))
      return
    }
    if (trimmed === '') {
      setNewEmailError(t('editor.emailRequired'))
      return
    }
    if (!isValidEmail(trimmed)) {
      setNewEmailError(t('editor.invalidEmail'))
      return
    }
    if (emails.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setNewEmailError(t('editor.duplicateEmail'))
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
        helperText={t('editor.photoHelp')}
        label={t('editor.photoLabel')}
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
      />

      {bilingual ? null : (
        <FormField
          errorMessage={roleError}
          id="researcher-role"
          label={t('editor.roleLabel')}
          onChange={setRole}
          required
          validate={requireNonEmpty(t('editor.roleRequired'))}
          value={role}
        />
      )}

      <FormField
        errorMessage={nameError}
        id="researcher-name"
        label={t('editor.nameLabel')}
        onChange={setName}
        required
        validate={requireNonEmpty(t('editor.nameRequired'))}
        value={name}
      />

      <div
        aria-labelledby="researcher-email-label"
        className="cms-form-field publication-authors"
        role="group"
      >
        <div className="publication-authors-header">
          <span className="cms-form-field-label" id="researcher-email-label">
            {t('editor.contactLabel')}
          </span>
          <span aria-live="polite" className="publication-authors-count">
            {t('editor.contactCount', { count: emails.length })}
          </span>
        </div>
        <div
          className={
            newEmailError ? 'publication-authors-box is-invalid' : 'publication-authors-box'
          }
        >
          {emails.length > 0 ? (
            <ul aria-label={t('editor.contactListLabel')} className="publication-authors-list">
              {emails.map((address) => (
                <li className="email-chip" key={address}>
                  {address}
                  <IconButton
                    className="email-chip-remove"
                    icon={<X size={12} strokeWidth={2} />}
                    label={t('editor.deleteContact', { address })}
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
              aria-label={t('editor.emailLabel')}
              onChange={(event) => {
                setNewEmail(event.target.value)
                setNewEmailError(null)
              }}
              onKeyDown={handleEmailKeyDown}
              placeholder={
                emails.length > 0
                  ? t('editor.emailPlaceholderAnother')
                  : t('editor.emailPlaceholder')
              }
              type="email"
              value={newEmail}
            />
            <Button className="publication-authors-add" onClick={addEmail} variant="secondary">
              {t('editor.add')}
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
        label={t('editor.institutionLabel')}
        onChange={setInstitution}
        required
        validate={requireNonEmpty(t('editor.institutionRequired'))}
        value={institution}
      />

      {props.translation ? (
        <ResearcherContentFields editing={props.translation.editing} ref={contentRef} />
      ) : (
        <FormField
          id="researcher-description"
          label={t('editor.descriptionLabel')}
          multiline
          onChange={setDescription}
          value={description}
        />
      )}

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('editor.cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? t('editor.uploading') : t('editor.save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
