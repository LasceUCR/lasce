import {
  accessFailure,
  invalidBodyFailure,
  parseApiError,
  reviewRequiredFailure,
  unexpectedFailure,
  withoutServerText,
  type ApiError,
  type SaveFailure,
} from '@/app/lib/cms/save'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  draftFromStored,
  hasContentChanges as hasTranslatableChanges,
  isConfirmed,
  isContentPath,
  reviewsNeeded as translatableReviewsNeeded,
  toContentInput,
  validateContent,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { contentCopy } from '@/app/lib/i18n/content/messages'
import es from '@/messages/es.json' with { type: 'json' }

import {
  solarPhysicsSectionContent,
  type SolarPhysicsSection,
  type SolarPhysicsSectionField,
  type SolarPhysicsSectionReviewConfirmation as ReviewConfirmation,
  type StoredSolarPhysicsSectionContent,
} from './solar-physics-section-schema'

export type { SaveFailure } from '@/app/lib/cms/save'
export {
  contentPath,
  errorsByLocale,
  resetConfirmations,
  type FormErrors,
} from '@/app/lib/i18n/content/form'

/**
 * The editing logic behind `LasceSectionForm` and `EditableLasceSection`, kept free of React so
 * every rule can be tested directly. Validation reuses the API's own content schema, so the
 * editor and `/api/solar-physics/lasce-section` cannot disagree about what is valid. The section
 * has no shared fields: everything it edits is the title and body in every language.
 */

/** Everything the editor holds while someone types. Text is kept as typed; it is trimmed on save. */
export type SectionDraft = ContentDraft<SolarPhysicsSectionField>

/** What the editor opened with, kept apart from the draft so changes can be detected. */
export interface SectionFormInitial {
  draft: SectionDraft
  /** The stored text in every language. */
  stored: StoredSolarPhysicsSectionContent
  /** True for a section that predates translations: its base text's language is unknown. */
  isLegacy: boolean
  /** The concurrency token to save against. */
  version: string
}

/** The texts of a failed save, from the `solarPhysics.saveErrors` namespace: plain text. */
export type SectionSaveMessages = typeof es.solarPhysics.saveErrors

/**
 * The language the editor is shown in, which is the site's (the header's selector), and what it
 * says in it. The API speaks Spanish; an editor in another language applies the same rules with
 * its own messages, and shows its own text instead of the server's.
 */
export interface EditorLanguage {
  uiLocale: Locale
  saveErrors: SectionSaveMessages
}

/** The editor in `uiLocale`, from its `solarPhysics.saveErrors` messages (plain text). */
export function editorLanguage(uiLocale: Locale, saveErrors: SectionSaveMessages): EditorLanguage {
  return { uiLocale, saveErrors }
}

/** The editor in Spanish, the source language: the default of the functions below. */
export const SPANISH_EDITOR: EditorLanguage = editorLanguage(
  defaultLocale,
  es.solarPhysics.saveErrors,
)

/**
 * The form for the section as loaded for an editor, or `null` when it carries no editing data
 * (the viewer cannot edit it). A legacy section opens with its base text on the Spanish tab and
 * an empty English tab: nothing is copied across languages to look like a translation.
 */
export function initialFromSection(section: SolarPhysicsSection): SectionFormInitial | null {
  const { editing } = section
  if (!editing) return null

  return {
    draft: draftFromStored(solarPhysicsSectionContent, editing.content),
    stored: editing.content,
    isLegacy: editing.isLegacy,
    version: editing.version,
  }
}

/** True when the title or body differs from what was stored, in any language. */
export function hasContentChanges(initial: SectionFormInitial, draft: SectionDraft): boolean {
  return hasTranslatableChanges(solarPhysicsSectionContent, initial.stored, draft)
}

/**
 * True once anything in the form differs from what it opened with, so closing it would lose
 * work and asks first. Compared as typed, unlike the save rules, which trim: whatever someone
 * typed counts as their work, even a space.
 */
export function hasUnsavedChanges(initial: SectionFormInitial, draft: SectionDraft): boolean {
  return Object.entries(draft).some(([locale, fields]) =>
    Object.entries(fields).some(
      ([field, value]) =>
        value !== (initial.draft[locale as Locale]?.[field as SolarPhysicsSectionField] ?? ''),
    ),
  )
}

/**
 * The fields to update or confirm because their counterpart changed alone, whether or not they
 * have been confirmed yet. Same rule as the API (`findPendingReviews`).
 */
export function reviewsNeeded(
  initial: SectionFormInitial,
  draft: SectionDraft,
): ReviewConfirmation[] {
  return translatableReviewsNeeded(solarPhysicsSectionContent, initial.stored, draft)
}

/** Every problem to show before saving, keyed by field path (`content.en.title`). */
export function validateDraft(
  initial: SectionFormInitial,
  draft: SectionDraft,
  confirmed: ReviewConfirmation[],
  language: EditorLanguage = SPANISH_EDITOR,
): FormErrors {
  return validateContent(
    solarPhysicsSectionContent,
    initial.stored,
    draft,
    confirmed,
    language.uiLocale,
  )
}

/**
 * The body of `PATCH /api/solar-physics/lasce-section`, or `null` when nothing changed. The
 * content goes in every language, with only the confirmations that this edit still needs.
 */
export function buildUpdateRequest(
  initial: SectionFormInitial,
  draft: SectionDraft,
  confirmed: ReviewConfirmation[],
): Record<string, unknown> | null {
  if (!hasContentChanges(initial, draft)) return null

  const body: Record<string, unknown> = {
    version: initial.version,
    content: toContentInput(solarPhysicsSectionContent, draft),
  }
  const confirmations = reviewsNeeded(initial, draft).filter((review) =>
    isConfirmed(confirmed, review),
  )
  if (confirmations.length > 0) body.confirmedUnchanged = confirmations

  return body
}

/** True for a path the form shows a message under. */
export function isFormField(path: string): boolean {
  return isContentPath(solarPhysicsSectionContent, path)
}

/** The answer's error, with the server's Spanish texts only when the editor is in Spanish too. */
function readError(body: unknown, language: EditorLanguage): ApiError {
  const error = parseApiError(body)
  return language.uiLocale === defaultLocale ? error : withoutServerText(error)
}

/** Turns an error response of the section endpoint into what the editor shows, in its language. */
export function describeSaveFailure(
  status: number,
  body: unknown,
  language: EditorLanguage = SPANISH_EDITOR,
): SaveFailure {
  const error = readError(body, language)
  const messages = language.saveErrors
  const { code } = error

  if (code === 'invalid-body') return invalidBodyFailure(error, isFormField, messages)
  if (code === 'review-required') {
    return reviewRequiredFailure(error, contentCopy[language.uiLocale].fieldPending, messages)
  }

  if (status === 409) return { message: messages.conflict, fieldErrors: {}, reopen: true }
  if (status === 404) return { message: messages.notFound, fieldErrors: {}, reopen: true }

  return accessFailure(status, error, messages) ?? unexpectedFailure(error, messages)
}
