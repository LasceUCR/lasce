import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'

import {
  contentSchema,
  doiSchema,
  externalUrlSchema,
  findPendingReviews,
  publicationDateSchema,
  sharedFieldSchemas,
  translatableFields,
  type LocalizedPublicationContent,
  type Publication,
  type ResearchGroup,
  type ReviewConfirmation,
  type StoredPublicationContent,
  type TranslatableField,
} from './publication-schema'

/**
 * The editing logic behind `PublicationForm` and `PublicationsExplorer`, kept free of React so
 * every rule can be tested directly. Validation reuses the API's own Zod schemas, so the editor
 * and `/api/publicaciones` cannot disagree about what is valid.
 */

/** A field of the form, named by its path in the API body (`content.en.title`, `DOI`, ...). */
export type FormFieldPath = string

export type FormErrors = Record<FormFieldPath, string>

/** Everything the editor holds while someone types. Text is kept as typed; it is trimmed on save. */
export interface PublicationDraft {
  content: Record<Locale, LocalizedPublicationContent>
  authors: string[]
  venue: string
  /** `YYYY-MM-DD`, the value of the date input. */
  date: string
  href: string
  DOI: string
  researchGroup: ResearchGroup
}

/** What the editor opened with, kept apart from the draft so changes can be detected. */
export interface PublicationFormInitial {
  draft: PublicationDraft
  /** The stored text in every language; `null` when creating a publication. */
  stored: StoredPublicationContent | null
  /** True for a record that predates translations: its base text's language is unknown. */
  isLegacy: boolean
  /** The concurrency token to save against; `null` when creating. */
  version: string | null
}

export const languageLabels: Record<Locale, string> = { es: 'Español', en: 'English' }

/** "en español" / "en inglés", as the API's messages say it. */
const inLanguage: Record<Locale, string> = { es: 'en español', en: 'en inglés' }

const fieldNames: Record<TranslatableField, string> = { title: 'el título', abstract: 'el resumen' }

export function contentPath(locale: Locale, field: TranslatableField): FormFieldPath {
  return `content.${locale}.${field}`
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function emptyContent(): Record<Locale, LocalizedPublicationContent> {
  return Object.fromEntries(
    locales.map((locale) => [locale, { title: '', abstract: '' }]),
  ) as Record<Locale, LocalizedPublicationContent>
}

/** A blank form for a new publication, dated today in the editor's own time zone. */
export function emptyInitial(today = new Date()): PublicationFormInitial {
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)

  return {
    draft: {
      content: emptyContent(),
      authors: [],
      venue: '',
      date: toDateInput(local),
      href: '',
      DOI: '',
      researchGroup: 'LASCE',
    },
    stored: null,
    isLegacy: false,
    version: null,
  }
}

/**
 * The form for an existing publication. Its text comes from `editing.content`, so a legacy
 * record opens with its base text on the Spanish tab and an empty English tab: nothing is
 * copied across languages to look like a translation.
 */
export function initialFromPublication(publication: Publication): PublicationFormInitial {
  const stored: StoredPublicationContent = publication.editing?.content ?? {
    es: { title: publication.title, abstract: publication.abstract },
    en: null,
  }

  const content = emptyContent()
  for (const locale of locales) {
    const text = stored[locale]
    if (text) content[locale] = { ...text }
  }

  return {
    draft: {
      content,
      authors: [...publication.authors],
      venue: publication.venue,
      date: toDateInput(publication.date),
      href: publication.href ?? '',
      DOI: publication.DOI ?? '',
      researchGroup: publication.researchGroup,
    },
    stored,
    isLegacy: publication.editing?.isLegacy ?? stored.en === null,
    version: publication.editing?.version ?? null,
  }
}

function sameText(a: string | undefined, b: string | undefined): boolean {
  return (a ?? '').trim() === (b ?? '').trim()
}

/** True when any title or abstract differs from what was stored. Always true when creating. */
export function hasContentChanges(initial: PublicationFormInitial, draft: PublicationDraft) {
  const { stored } = initial
  if (!stored) return true

  return locales.some((locale) =>
    translatableFields.some(
      (field) => !sameText(stored[locale]?.[field], draft.content[locale][field]),
    ),
  )
}

/**
 * The fields to update or confirm because their counterpart changed alone, whether or not they
 * have been confirmed yet. Same rule as the API (`findPendingReviews`).
 */
export function reviewsNeeded(
  initial: PublicationFormInitial,
  draft: PublicationDraft,
): ReviewConfirmation[] {
  if (!initial.stored || !hasContentChanges(initial, draft)) return []
  return findPendingReviews(initial.stored, draft.content, [])
}

function isConfirmed(confirmed: ReviewConfirmation[], review: ReviewConfirmation) {
  return confirmed.some(
    (confirmation) => confirmation.locale === review.locale && confirmation.field === review.field,
  )
}

/** Drops every confirmation of `field`: changing either language invalidates them. */
export function resetConfirmations(
  confirmed: ReviewConfirmation[],
  field: TranslatableField,
): ReviewConfirmation[] {
  return confirmed.filter((confirmation) => confirmation.field !== field)
}

const languageNames: Record<Locale, string> = { es: 'español', en: 'inglés' }

/**
 * Why `review` needs attention. When the other language had no text yet (a legacy record being
 * translated for the first time) nothing in it "changed": the point is that the base text may
 * not be in this language at all, so the message says that instead.
 */
export function reviewMessage(
  { locale, field }: ReviewConfirmation,
  stored: StoredPublicationContent | null = null,
): string {
  const other = locales.find((candidate) => candidate !== locale) ?? defaultLocale
  const name = fieldNames[field]

  if (stored && stored[other] === null) {
    return `Al agregar la versión en ${languageNames[other]}, revise ${name} ${inLanguage[locale]}: el texto original podría estar en otro idioma. Actualícelo o confirme que es correcto.`
  }

  return `Cambió ${name} ${inLanguage[other]}. Actualice ${name} ${inLanguage[locale]} o confirme que sigue siendo correcto.`
}

export function confirmationLabel({ locale, field }: ReviewConfirmation): string {
  const name = fieldNames[field]
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${inLanguage[locale]} sigue siendo correcto`
}

function sameAuthors(a: string[], b: string[]) {
  return a.length === b.length && a.every((author, index) => author === b[index])
}

type SharedField = 'authors' | 'venue' | 'date' | 'href' | 'DOI' | 'researchGroup'

/** The shared fields that differ from what the form opened with. All of them when creating. */
export function changedSharedFields(
  initial: PublicationFormInitial,
  draft: PublicationDraft,
): SharedField[] {
  const before = initial.draft
  const creating = initial.stored === null
  const changed: SharedField[] = []

  if (creating || !sameAuthors(before.authors, draft.authors)) changed.push('authors')
  if (creating || !sameText(before.venue, draft.venue)) changed.push('venue')
  if (creating || before.date !== draft.date) changed.push('date')
  if (creating || !sameText(before.href, draft.href)) changed.push('href')
  if (creating || !sameText(before.DOI, draft.DOI)) changed.push('DOI')
  if (creating || before.researchGroup !== draft.researchGroup) changed.push('researchGroup')

  return changed
}

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : (result.error?.issues[0]?.message ?? 'Valor no válido.')
}

/**
 * Every problem to show before saving, keyed by field path. Titles and abstracts are checked in
 * both languages when creating or when any of them changed; a shared field is checked when it
 * changed (all of them when creating), so a legacy record can be corrected without touching the
 * fields it already lacks.
 */
export function validateDraft(
  initial: PublicationFormInitial,
  draft: PublicationDraft,
  confirmed: ReviewConfirmation[],
): FormErrors {
  const errors: FormErrors = {}

  if (hasContentChanges(initial, draft)) {
    const result = contentSchema.safeParse(draft.content)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = ['content', ...issue.path.map(String)].join('.')
        errors[path] ??= issue.message
      }
    }

    for (const review of reviewsNeeded(initial, draft)) {
      if (!isConfirmed(confirmed, review)) {
        errors[contentPath(review.locale, review.field)] ??= REVIEW_FIELD_MESSAGE
      }
    }
  }

  const checks: Record<SharedField, () => string | null> = {
    authors: () => firstMessage(sharedFieldSchemas.authors.safeParse(draft.authors)),
    venue: () => firstMessage(sharedFieldSchemas.venue.safeParse(draft.venue)),
    date: () => firstMessage(publicationDateSchema.safeParse(draft.date)),
    href: () => firstMessage(externalUrlSchema.safeParse(draft.href)),
    DOI: () => firstMessage(doiSchema.safeParse(draft.DOI)),
    researchGroup: () =>
      firstMessage(sharedFieldSchemas.researchGroup.safeParse(draft.researchGroup)),
  }

  for (const field of changedSharedFields(initial, draft)) {
    const message = checks[field]()
    if (message) errors[field] = message
  }

  return errors
}

/** Error counts per language tab, for the indicator on each tab. */
export function errorsByLocale(errors: FormErrors): Record<Locale, number> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.keys(errors).filter((path) => path.startsWith(`content.${locale}.`)).length,
    ]),
  ) as Record<Locale, number>
}

function trimmedContent(draft: PublicationDraft) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        title: draft.content[locale].title.trim(),
        abstract: draft.content[locale].abstract.trim(),
      },
    ]),
  ) as Record<Locale, LocalizedPublicationContent>
}

function sharedValue(draft: PublicationDraft, field: SharedField) {
  switch (field) {
    case 'authors':
      return draft.authors
    case 'venue':
      return draft.venue.trim()
    case 'date':
      return draft.date
    case 'href':
      return draft.href.trim() || null
    case 'DOI':
      return draft.DOI.trim() || null
    case 'researchGroup':
      return draft.researchGroup
  }
}

/** The body of `POST /api/publicaciones`. */
export function buildCreateRequest(draft: PublicationDraft): Record<string, unknown> {
  const body: Record<string, unknown> = { content: trimmedContent(draft) }
  for (const field of changedSharedFields(emptyInitial(), draft)) {
    body[field] = sharedValue(draft, field)
  }
  return body
}

/**
 * The body of `PATCH /api/publicaciones/[id]`, or `null` when nothing changed. Titles and
 * abstracts are sent, in both languages, only when one of them changed; otherwise the request
 * is a shared-field update. Only the shared fields that changed are sent, and only the
 * confirmations that this edit still needs.
 */
export function buildUpdateRequest(
  initial: PublicationFormInitial,
  draft: PublicationDraft,
  confirmed: ReviewConfirmation[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = { version: initial.version }

  if (hasContentChanges(initial, draft)) {
    body.content = trimmedContent(draft)
    const confirmations = reviewsNeeded(initial, draft).filter((review) =>
      isConfirmed(confirmed, review),
    )
    if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  }

  for (const field of changedSharedFields(initial, draft)) {
    body[field] = sharedValue(draft, field)
  }

  return Object.keys(body).length > 1 ? body : null
}

const sharedFormFields = new Set(['authors', 'venue', 'date', 'href', 'DOI', 'researchGroup'])

/** True for a path the form shows a message under. */
export function isFormField(path: string): boolean {
  if (sharedFormFields.has(path)) return true
  const [root, locale, field] = path.split('.')
  return (
    root === 'content' &&
    locales.some((each) => each === locale) &&
    translatableFields.some((each) => each === field)
  )
}

export interface SaveFailure {
  /** Shown above the form. */
  message: string
  /** Shown under the fields, keyed by path. */
  fieldErrors: FormErrors
  /** True when the form can no longer be saved as is and must be reopened. */
  reopen: boolean
}

interface ErrorBody {
  error?: unknown
  code?: unknown
  issues?: unknown
  pending?: unknown
}

export const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

const FIELDS_MESSAGE = 'Revise los campos marcados.'

/** Shown under a field whose counterpart changed alone, next to the explanation and the switch. */
export const REVIEW_FIELD_MESSAGE = 'Actualice este campo o confirme que sigue siendo correcto.'

function listOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : []
}

/** Turns an error response of `/api/publicaciones` into what the editor shows. */
export function describeSaveFailure(status: number, body: ErrorBody | null): SaveFailure {
  const serverMessage = typeof body?.error === 'string' ? body.error : null
  const code = typeof body?.code === 'string' ? body.code : null

  if (code === 'invalid-body') {
    const fieldErrors: FormErrors = {}
    const general: string[] = []
    for (const issue of listOf(body?.issues)) {
      const path = typeof issue.path === 'string' ? issue.path : ''
      const message = typeof issue.message === 'string' ? issue.message : FIELDS_MESSAGE
      // Only a field the form shows can carry the message; anything else (`version`, the body
      // itself) is said above the form, or it would be counted but never seen.
      if (isFormField(path)) fieldErrors[path] ??= message
      else general.push(message)
    }
    return {
      message: general.length > 0 ? general.join(' ') : FIELDS_MESSAGE,
      fieldErrors,
      reopen: false,
    }
  }

  if (code === 'review-required') {
    const fieldErrors: FormErrors = {}
    for (const pending of listOf(body?.pending)) {
      if (typeof pending.path === 'string') {
        fieldErrors[pending.path] = REVIEW_FIELD_MESSAGE
      }
    }
    return { message: serverMessage ?? FIELDS_MESSAGE, fieldErrors, reopen: false }
  }

  if (code === 'duplicate-doi' || code === 'duplicate-external-url') {
    const field = code === 'duplicate-doi' ? 'DOI' : 'href'
    return {
      message: FIELDS_MESSAGE,
      fieldErrors: { [field]: serverMessage ?? 'Ya existe una publicación con este valor.' },
      reopen: false,
    }
  }

  if (status === 409) {
    return {
      message:
        'Otra persona guardó cambios en esta publicación después de que usted la abrió. Sus cambios no se guardaron, para no sobrescribir los de esa persona. Copie lo que necesite, cierre el editor y vuelva a abrir la publicación.',
      fieldErrors: {},
      reopen: true,
    }
  }

  if (status === 404) {
    return {
      message:
        'Esta publicación ya no existe; es posible que otra persona la haya eliminado. Sus cambios no se guardaron.',
      fieldErrors: {},
      reopen: true,
    }
  }

  if (status === 401) {
    return {
      message: `${serverMessage ?? 'No ha iniciado sesión.'} Inicie sesión de nuevo para guardar; sus cambios siguen en el formulario.`,
      fieldErrors: {},
      reopen: false,
    }
  }

  if (status === 403) {
    return {
      message: serverMessage ?? 'No tiene permisos para modificar este contenido.',
      fieldErrors: {},
      reopen: false,
    }
  }

  return { message: serverMessage ?? SAVE_ERROR_MESSAGE, fieldErrors: {}, reopen: false }
}
