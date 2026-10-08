'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { IconButton } from '@/app/components/public/IconButton'
import { Modal } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  errorSummary,
  isConfirmed,
  languageTabFlags,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  contentPath,
  languageLabels,
  resetConfirmations,
  reviewsNeeded,
  validateDraft,
  type FormErrors,
  type PublicationDraft,
  type PublicationFormInitial,
} from '@/app/lib/publication-form'
import {
  doiSchema,
  externalUrlSchema,
  publicationContent,
  type ResearchGroup,
  type ReviewConfirmation,
  type TranslatableField,
} from '@/app/lib/publication-schema'

const researchGroupOptions: FormFieldOption[] = [
  { value: 'LASCE', label: 'LASCE' },
  { value: 'ROSAC', label: 'ROSAC' },
]

type SharedTextField = 'venue' | 'date' | 'href' | 'DOI'

export interface PublicationFormProps {
  /** What the form opens with: from `emptyInitial()` or `initialFromPublication()`. */
  initial: PublicationFormInitial
  /** Called once the edit is valid and confirmed, with the confirmations it still needs. */
  onSave: (draft: PublicationDraft, confirmed: ReviewConfirmation[]) => void
  onCancel: () => void
  confirmTitle?: string
  confirmMessage?: string
  /**
   * Errors the server returned for the last save, keyed by field path (`content.en.title`).
   * Each one stays until its field changes.
   */
  serverErrors?: FormErrors
}

/**
 * Creates or edits a publication in both languages. Titles and abstracts sit in one tab per
 * language (`LanguageTabs`: WAI-ARIA tabs with arrow keys, Home and End); the shared fields sit
 * below, outside the tabs. Both panels stay mounted, so switching tabs never loses what was typed.
 * The tabs only choose the translation being edited; they never change the site's language.
 *
 * When a title or abstract changes in one language only, the same field in the other language
 * must change too or be confirmed with a switch, in this edit: a confirmation is dropped as
 * soon as either language of that field changes again. A tab with problems says so in its
 * label, and trying to save opens the first tab that has one.
 *
 * A legacy record (saved before languages existed) opens with its base text on the Spanish tab,
 * flagged as possibly not Spanish, and an empty English tab: nothing is copied across to look
 * like a translation. Its shared fields can be saved without translating it.
 */
export function PublicationForm({
  initial,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta publicación?',
  serverErrors,
}: PublicationFormProps) {
  const formId = useId()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<PublicationDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(
    () => tabWithErrors(serverErrors ?? {}, defaultLocale) ?? defaultLocale,
  )
  const [focusRequest, setFocusRequest] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [isAddingAuthor, setIsAddingAuthor] = useState(false)
  const [newAuthor, setNewAuthor] = useState('')
  const [newAuthorError, setNewAuthorError] = useState<string | null>(null)

  // New server errors replace the previous ones and open the tab they point at. Adjusted while
  // rendering rather than in an effect, so the errors and the tab change in the same render.
  const [server, setServer] = useState({ source: serverErrors, errors: serverErrors ?? {} })
  if (serverErrors !== server.source) {
    const errors = serverErrors ?? {}
    setServer({ source: serverErrors, errors })
    const target = tabWithErrors(errors, tab)
    if (target) setTab(target)
  }

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(initial, draft)
  const errors: FormErrors = {
    ...server.errors,
    ...(attempted ? validateDraft(initial, draft, confirmed) : {}),
  }

  function clearServerErrors(paths: string[]) {
    if (!paths.some((path) => path in server.errors)) return
    setServer((current) => ({
      ...current,
      errors: Object.fromEntries(
        Object.entries(current.errors).filter(([path]) => !paths.includes(path)),
      ),
    }))
  }

  function setContent(locale: Locale, field: TranslatableField, value: string) {
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], [field]: value } },
    }))
    setConfirmed((current) => resetConfirmations(current, field))
    clearServerErrors(locales.map((each) => contentPath(each, field)))
  }

  function setShared(field: SharedTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    clearServerErrors([field])
  }

  function setAuthors(authors: string[]) {
    setDraft((current) => ({ ...current, authors }))
    clearServerErrors(['authors'])
  }

  function setConfirmation(review: ReviewConfirmation, checked: boolean) {
    setConfirmed((current) => withConfirmation(current, review, checked))
    clearServerErrors([contentPath(review.locale, review.field)])
  }

  function openAddAuthor() {
    setNewAuthor('')
    setNewAuthorError(null)
    setIsAddingAuthor(true)
  }

  function handleAddAuthor() {
    const trimmed = newAuthor.trim()

    if (!trimmed) {
      setNewAuthorError('El nombre del autor es obligatorio.')
      return
    }

    if (draft.authors.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setNewAuthorError('Ese autor ya fue agregado.')
      return
    }

    setAuthors([...draft.authors, trimmed])
    setIsAddingAuthor(false)
  }

  function handleSave() {
    setAttempted(true)
    const found = validateDraft(initial, draft, confirmed)

    if (Object.keys(found).length === 0) {
      setConfirmOpen(true)
      return
    }

    const target = tabWithErrors(found, tab)
    if (target) setTab(target)
    setFocusRequest((current) => current + 1)
  }

  function handleConfirm() {
    setConfirmOpen(false)
    onSave(draft, confirmationsStillNeeded(confirmed, needed))
  }

  function reviewControl(locale: Locale, field: TranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(publicationContent, review)}
        message={reviewMessage(publicationContent, review, initial.stored, draft.content)}
        onChange={(checked) => setConfirmation(review, checked)}
      />
    )
  }

  const summary = errorSummary(errors, tab)

  return (
    <div className="publication-form" ref={formRef}>
      <LanguageTabs
        flags={languageTabFlags(initial.stored, errors, needed, confirmed)}
        onSelect={setTab}
        selected={tab}
      >
        {(locale) => (
          <>
            {initial.isLegacy && locale === defaultLocale ? (
              <Notice>
                Este texto se registró antes de que existieran las versiones por idioma y podría no
                estar en español. Si cambia el título o el resumen, revíselo también.
              </Notice>
            ) : null}

            {initial.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">
                Esta publicación aún no tiene versión en inglés. Para cambiar el título o el resumen
                debe completar ambos idiomas; los demás campos se pueden editar sin traducirla.
              </Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={`Título (${languageLabels[locale]})`}
              lang={contentFieldLang(initial.stored, locale)}
              onChange={(value) => setContent(locale, 'title', value)}
              required
              value={draft.content[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'abstract')]}
              id={`${formId}-${locale}-abstract`}
              label={`Resumen (${languageLabels[locale]})`}
              lang={contentFieldLang(initial.stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'abstract', value)}
              required
              value={draft.content[locale].abstract}
            />
            {reviewControl(locale, 'abstract')}
          </>
        )}
      </LanguageTabs>

      <FormField
        error={errors.date}
        id={`${formId}-date`}
        label="Fecha de publicación"
        onChange={(value) => setShared('date', value)}
        required
        type="date"
        value={draft.date}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label" id={`${formId}-authors-label`}>
          Autores
        </span>

        <div
          aria-describedby={errors.authors ? `${formId}-authors-error` : undefined}
          aria-labelledby={`${formId}-authors-label`}
          className={`email-chip-field${errors.authors ? ' form-field-error' : ''}`}
          role="group"
        >
          {draft.authors.map((author) => (
            <span className="email-chip" key={author}>
              {author}

              <IconButton
                className="email-chip-remove"
                icon={<X size={12} strokeWidth={2} />}
                label={`Eliminar ${author}`}
                onClick={() => setAuthors(draft.authors.filter((existing) => existing !== author))}
              />
            </span>
          ))}

          <IconButton
            className="email-chip-add"
            icon={<Plus size={14} strokeWidth={2} />}
            label="Añadir autor"
            onClick={openAddAuthor}
          />
        </div>

        {errors.authors ? (
          <p className="form-field-error" id={`${formId}-authors-error`}>
            {errors.authors}
          </p>
        ) : null}
      </div>

      <Modal
        onClose={() => setIsAddingAuthor(false)}
        open={isAddingAuthor}
        size="small"
        title="Añadir autor"
      >
        <FormField
          id={`${formId}-new-author`}
          label="Nombre del autor"
          onChange={(value) => {
            setNewAuthor(value)
            setNewAuthorError(null)
          }}
          value={newAuthor}
        />

        {newAuthorError ? (
          <p className="form-alert" role="alert">
            {newAuthorError}
          </p>
        ) : null}

        <div className="cms-form-actions">
          <Button onClick={() => setIsAddingAuthor(false)} variant="secondary">
            Cancelar
          </Button>

          <Button disabled={newAuthor.trim() === ''} onClick={handleAddAuthor} variant="primary">
            Añadir
          </Button>
        </div>
      </Modal>

      <FormField
        error={errors.href}
        id={`${formId}-href`}
        label="Enlace externo"
        onChange={(value) => setShared('href', value)}
        type="url"
        validate={(value) => {
          const result = externalUrlSchema.safeParse(value)
          if (!result.success) throw new Error(result.error.issues[0]?.message)
        }}
        value={draft.href}
      />

      <FormField
        error={errors.DOI}
        id={`${formId}-doi`}
        label="DOI"
        onChange={(value) => setShared('DOI', value)}
        placeholder="10.1234/ejemplo"
        validate={(value) => {
          const result = doiSchema.safeParse(value)
          if (!result.success) throw new Error(result.error.issues[0]?.message)
        }}
        value={draft.DOI}
      />

      <FormField
        error={errors.venue}
        id={`${formId}-venue`}
        label="Revista/Publicación"
        onChange={(value) => setShared('venue', value)}
        required
        value={draft.venue}
      />

      <FormField
        error={errors.researchGroup}
        id={`${formId}-research-group`}
        label="Grupo"
        onChange={(value) => {
          setDraft((current) => ({ ...current, researchGroup: value as ResearchGroup }))
          clearServerErrors(['researchGroup'])
        }}
        options={researchGroupOptions}
        value={draft.researchGroup}
      />

      {summary ? (
        <Notice role="alert" tone="error">
          {summary}
        </Notice>
      ) : null}

      <div className="nosotros-activity-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="primary">
          Confirmar
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
