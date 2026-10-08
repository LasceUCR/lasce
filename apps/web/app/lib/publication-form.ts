import {
  accessFailure,
  FIELDS_MESSAGE,
  invalidBodyFailure,
  parseApiError,
  reviewRequiredFailure,
  unexpectedFailure,
  type SaveFailure,
} from '@/app/lib/cms/save'
import { localeLabels, type Locale } from '@/app/lib/i18n/config'
import {
  draftFromStored,
  emptyContentDraft,
  hasContentChanges as hasTranslatableChanges,
  isConfirmed,
  isContentPath,
  reviewsNeeded as translatableReviewsNeeded,
  toContentInput,
  validateContent,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { editorCopy } from '@/app/lib/i18n/content/messages'
import { isLegacyContent, storedContentFrom } from '@/app/lib/i18n/content/resolve'

import {
  doiSchema,
  externalUrlSchema,
  publicationContent,
  publicationDateSchema,
  sharedFieldSchemas,
  type Publication,
  type ResearchGroup,
  type ReviewConfirmation,
  type StoredPublicationContent,
  type TranslatableField,
} from './publication-schema'

export { SAVE_ERROR_MESSAGE, type SaveFailure } from '@/app/lib/cms/save'
export {
  contentPath,
  errorsByLocale,
  resetConfirmations,
  type FormErrors,
} from '@/app/lib/i18n/content/form'

/**
 * The editing logic behind `PublicationForm` and `PublicationsExplorer`, kept free of React so
 * every rule can be tested directly. Validation reuses the API's own Zod schemas, so the editor
 * and `/api/publicaciones` cannot disagree about what is valid.
 *
 * The title and abstract are handled by the shared bilingual form helpers
 * (`app/lib/i18n/content/form.ts`), configured with `publicationContent`. What stays here is
 * specific to publications: the shared fields (authors, venue, date, link, DOI, group), their
 * validation, the request bodies and the meaning of each API error.
 */

/** A field of the form, named by its path in the API body (`content.en.title`, `DOI`, ...). */
export type FormFieldPath = string

/** Everything the editor holds while someone types. Text is kept as typed; it is trimmed on save. */
export interface PublicationDraft {
  content: ContentDraft<TranslatableField>
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

/** Each language's name, as the tabs and the field labels show it. */
export const languageLabels: Record<Locale, string> = localeLabels

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** A blank form for a new publication, dated today in the editor's own time zone. */
export function emptyInitial(today = new Date()): PublicationFormInitial {
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)

  return {
    draft: {
      content: emptyContentDraft(publicationContent),
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
  // Without editing data, only the text shown is known: treat it as base text with no translation.
  const stored: StoredPublicationContent =
    publication.editing?.content ?? storedContentFrom(publicationContent, publication, [])

  return {
    draft: {
      content: draftFromStored(publicationContent, stored),
      authors: [...publication.authors],
      venue: publication.venue,
      date: toDateInput(publication.date),
      href: publication.href ?? '',
      DOI: publication.DOI ?? '',
      researchGroup: publication.researchGroup,
    },
    stored,
    isLegacy: publication.editing?.isLegacy ?? isLegacyContent(stored),
    version: publication.editing?.version ?? null,
  }
}

function sameText(a: string | undefined, b: string | undefined): boolean {
  return (a ?? '').trim() === (b ?? '').trim()
}

/** True when any title or abstract differs from what was stored. Always true when creating. */
export function hasContentChanges(initial: PublicationFormInitial, draft: PublicationDraft) {
  return hasTranslatableChanges(publicationContent, initial.stored, draft.content)
}

/**
 * The fields to update or confirm because their counterpart changed alone, whether or not they
 * have been confirmed yet. Same rule as the API (`findPendingReviews`).
 */
export function reviewsNeeded(
  initial: PublicationFormInitial,
  draft: PublicationDraft,
): ReviewConfirmation[] {
  return translatableReviewsNeeded(publicationContent, initial.stored, draft.content)
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
  const errors = validateContent(publicationContent, initial.stored, draft.content, confirmed)

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
  const body: Record<string, unknown> = {
    content: toContentInput(publicationContent, draft.content),
  }
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
    body.content = toContentInput(publicationContent, draft.content)
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
  return sharedFormFields.has(path) || isContentPath(publicationContent, path)
}

/** Shown under a field whose counterpart changed alone, next to the explanation and the switch. */
export const REVIEW_FIELD_MESSAGE = editorCopy.fieldPending

/** Turns an error response of `/api/publicaciones` into what the editor shows. */
export function describeSaveFailure(status: number, body: unknown): SaveFailure {
  const error = parseApiError(body)
  const { code, message: serverMessage } = error

  if (code === 'invalid-body') return invalidBodyFailure(error, isFormField)
  if (code === 'review-required') return reviewRequiredFailure(error, REVIEW_FIELD_MESSAGE)

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

  return accessFailure(status, error) ?? unexpectedFailure(error)
}
