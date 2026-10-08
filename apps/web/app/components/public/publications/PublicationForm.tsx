'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { IconButton } from '@/app/components/public/IconButton'
import { Modal } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { Toggle } from '@/app/components/public/Toggle'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationLabel,
  contentPath,
  errorsByLocale,
  languageLabels,
  resetConfirmations,
  reviewMessage,
  reviewsNeeded,
  validateDraft,
  type FormErrors,
  type PublicationDraft,
  type PublicationFormInitial,
} from '@/app/lib/publication-form'
import {
  doiSchema,
  externalUrlSchema,
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

function sameReview(a: ReviewConfirmation, b: ReviewConfirmation) {
  return a.locale === b.locale && a.field === b.field
}

/** The language tab to show for `errors`: the current one if it has any, else the first that does. */
function tabWithErrors(errors: FormErrors, current: Locale): Locale | null {
  const counts = errorsByLocale(errors)
  if (counts[current] > 0) return null
  return locales.find((locale) => counts[locale] > 0) ?? null
}

/**
 * Creates or edits a publication in both languages. Titles and abstracts sit in one tab per
 * language (WAI-ARIA tabs: roving focus, arrow keys, Home and End); the shared fields sit below,
 * outside the tabs. Both panels stay mounted, so switching tabs never loses what was typed.
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
  const tabRefs = useRef<Partial<Record<Locale, HTMLButtonElement | null>>>({})

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
  const errorCounts = errorsByLocale(errors)

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
    setConfirmed((current) =>
      checked
        ? [...current.filter((each) => !sameReview(each, review)), review]
        : current.filter((each) => !sameReview(each, review)),
    )
    clearServerErrors([contentPath(review.locale, review.field)])
  }

  function selectTab(locale: Locale, moveFocus = false) {
    setTab(locale)
    if (moveFocus) tabRefs.current[locale]?.focus()
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = locales.indexOf(tab)
    const last = locales.length - 1
    let target: Locale | undefined

    if (event.key === 'ArrowRight') target = locales[index === last ? 0 : index + 1]
    else if (event.key === 'ArrowLeft') target = locales[index === 0 ? last : index - 1]
    else if (event.key === 'Home') target = locales[0]
    else if (event.key === 'End') target = locales[last]

    if (!target) return
    event.preventDefault()
    selectTab(target, true)
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
    onSave(
      draft,
      confirmed.filter((confirmation) => needed.some((review) => sameReview(review, confirmation))),
    )
  }

  function tabFlag(locale: Locale): string | null {
    const unconfirmed = needed.filter(
      (review) => review.locale === locale && !confirmed.some((each) => sameReview(each, review)),
    )
    const count = new Set([
      ...Object.keys(errors).filter((path) => path.startsWith(`content.${locale}.`)),
      ...unconfirmed.map((review) => contentPath(review.locale, review.field)),
    ]).size

    if (count > 0) return count === 1 ? '1 por revisar' : `${count} por revisar`
    if (locale !== defaultLocale && initial.stored?.[locale] === null) return 'Sin traducción'
    return null
  }

  function reviewControl(locale: Locale, field: TranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <div className="publication-form-review">
        <Notice tone="warning">{reviewMessage(review, initial.stored)}</Notice>
        <Toggle
          checked={confirmed.some((each) => sameReview(each, review))}
          id={`${formId}-${locale}-${field}-confirm`}
          label={confirmationLabel(review)}
          onChange={(checked) => setConfirmation(review, checked)}
        />
      </div>
    )
  }

  const totalErrors = Object.keys(errors).length
  const otherTabsWithErrors = locales.filter((locale) => locale !== tab && errorCounts[locale] > 0)

  return (
    <div className="publication-form" ref={formRef}>
      <div
        aria-label="Idioma del contenido"
        className="access-tabs"
        onKeyDown={handleTabKeyDown}
        role="tablist"
      >
        {locales.map((locale) => {
          const flag = tabFlag(locale)

          return (
            <button
              aria-controls={`${formId}-${locale}-panel`}
              aria-selected={tab === locale}
              className="access-tab"
              id={`${formId}-${locale}-tab`}
              key={locale}
              lang={locale}
              onClick={() => selectTab(locale)}
              ref={(element) => {
                tabRefs.current[locale] = element
              }}
              role="tab"
              tabIndex={tab === locale ? 0 : -1}
              type="button"
            >
              {languageLabels[locale]}
              {flag ? (
                <>
                  {' · '}
                  <span className="publication-form-tab-flag" lang="es">
                    {flag}
                  </span>
                </>
              ) : null}
            </button>
          )
        })}
      </div>

      {locales.map((locale) => (
        <div
          aria-labelledby={`${formId}-${locale}-tab`}
          className="publication-form-panel"
          hidden={tab !== locale}
          id={`${formId}-${locale}-panel`}
          key={locale}
          role="tabpanel"
        >
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
            onChange={(value) => setContent(locale, 'title', value)}
            required
            value={draft.content[locale].title}
          />
          {reviewControl(locale, 'title')}

          <FormField
            error={errors[contentPath(locale, 'abstract')]}
            id={`${formId}-${locale}-abstract`}
            label={`Resumen (${languageLabels[locale]})`}
            multiline
            onChange={(value) => setContent(locale, 'abstract', value)}
            required
            value={draft.content[locale].abstract}
          />
          {reviewControl(locale, 'abstract')}
        </div>
      ))}

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

      {totalErrors > 0 ? (
        <Notice role="alert" tone="error">
          {totalErrors === 1
            ? 'Hay 1 campo por revisar.'
            : `Hay ${totalErrors} campos por revisar.`}
          {otherTabsWithErrors.length > 0
            ? ` Revise también la pestaña ${otherTabsWithErrors.map((locale) => languageLabels[locale]).join(' y ')}.`
            : ''}
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
