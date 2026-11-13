import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  draftFromStored,
  emptyContentDraft,
  hasContentChanges as hasTranslatableChanges,
  isConfirmed,
  reviewsNeeded as translatableReviewsNeeded,
  toContentInput,
  validateContent,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { isLegacyContent, storedContentFrom } from '@/app/lib/i18n/content/resolve'
import es from '@/messages/es.json' with { type: 'json' }

import {
  academicActivityContent,
  type AcademicActivityField,
  type ReviewConfirmation,
  type StoredAcademicActivityContent,
} from './academic-activities-schema'
import type { AcademicActivity } from './academic-activities'

export type { FormErrors } from '@/app/lib/i18n/content/form'

/**
 * The editing logic behind `AcademicActivityForm` and `AcademicActivitiesPage`, kept free of
 * React so every rule can be tested directly. Validation reuses the API's own Zod schemas
 * (`academic-activities-schema.ts`), so the editor and `/api/academic-activities` cannot
 * disagree about what is valid.
 *
 * `title`, `category`, `description` and `photoAlt` are handled by the shared bilingual form
 * helpers (`app/lib/i18n/content/form.ts`), configured with `academicActivityContent`. What stays
 * here is specific to academic activities: the shared fields (dates, location), the photo (a
 * separate upload step the form owns directly, like the gallery's media form) and the meaning of
 * each API error.
 */

/** Everything the editor holds while someone types. Text is kept as typed; it is trimmed on save. */
export interface AcademicActivityDraft {
  content: ContentDraft<AcademicActivityField>
  /** `yyyy-mm-dd`, the value of the date input. */
  startDate: string
  /** `yyyy-mm-dd`, or `''` for a single-day activity. */
  endDate: string
  location: string
}

/** What the editor opened with, kept apart from the draft so changes can be detected. */
export interface AcademicActivityFormInitial {
  draft: AcademicActivityDraft
  /** The stored text in every language; `null` when creating a new activity. */
  stored: StoredAcademicActivityContent | null
  /** True for an activity that predates translations: its base text's language is unknown. */
  isLegacy: boolean
  /** The concurrency token to save against; `null` when creating. */
  version: string | null
  /** The photo as stored, so an edit that never touches it keeps showing it. `''` when creating. */
  photoUrl: string
}

/** A blank form for a new activity. */
export function emptyInitial(): AcademicActivityFormInitial {
  return {
    draft: {
      content: emptyContentDraft(academicActivityContent),
      startDate: '',
      endDate: '',
      location: '',
    },
    stored: null,
    isLegacy: false,
    version: null,
    photoUrl: '',
  }
}

/**
 * The form for an existing activity. Its text comes from `editing.content`, so a legacy activity
 * opens with its base text on the Spanish tab and an empty English tab: nothing is copied across
 * languages to look like a translation.
 */
export function initialFromActivity(activity: AcademicActivity): AcademicActivityFormInitial {
  // Without editing data, only the text shown is known: treat it as base text with no translation.
  const stored: StoredAcademicActivityContent =
    activity.editing?.content ?? storedContentFrom(academicActivityContent, activity, [])

  return {
    draft: {
      content: draftFromStored(academicActivityContent, stored),
      startDate: activity.startDate,
      endDate: activity.endDate ?? '',
      location: activity.location,
    },
    stored,
    isLegacy: activity.editing?.isLegacy ?? isLegacyContent(stored),
    version: activity.editing?.version ?? null,
    photoUrl: activity.photoUrl,
  }
}

/** True when any title, category, description or photo alt text differs from what was stored. */
export function hasContentChanges(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
): boolean {
  return hasTranslatableChanges(academicActivityContent, initial.stored, draft.content)
}

/**
 * True once anything in the form differs from what it opened with, so closing it would lose work
 * and asks first. Compared as typed: whatever someone typed counts as their work, even a space.
 */
export function hasUnsavedChanges(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
  photoChanged: boolean,
): boolean {
  return photoChanged || JSON.stringify(initial.draft) !== JSON.stringify(draft)
}

/**
 * The fields to update or confirm because their counterpart changed alone, whether or not they
 * have been confirmed yet. Same rule as the API (`findPendingReviews`).
 */
export function reviewsNeeded(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
): ReviewConfirmation[] {
  return translatableReviewsNeeded(academicActivityContent, initial.stored, draft.content)
}

/** The dates, as the form opened with them. */
function datesOf(draft: AcademicActivityDraft) {
  return { startDate: draft.startDate, endDate: draft.endDate || null }
}

/** True when the start or end date differs from what the form opened with. Always true while creating. */
export function datesChanged(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
): boolean {
  return (
    initial.stored === null ||
    JSON.stringify(datesOf(initial.draft)) !== JSON.stringify(datesOf(draft))
  )
}

/** True when the location differs from what the form opened with. Always true while creating. */
export function locationChanged(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
): boolean {
  return initial.stored === null || initial.draft.location.trim() !== draft.location.trim()
}

/**
 * The messages of the shared fields' rules, from the `academicActivities.validation` namespace.
 * They are plain text, read with `t.raw` in the editor: no ICU arguments.
 */
export type AcademicActivityFieldMessages = typeof es.academicActivities.validation

/**
 * Every problem to show before saving, keyed by field path. Title, category, description and
 * photo alt text are checked in both languages when creating or when any of them changed. The
 * start date is always required; the end date, when given, must not be before it. The location
 * and the photo are checked only while creating or when they changed, so a legacy activity can be
 * corrected without touching fields it already lacks. Messages are in `uiLocale`.
 */
export function validateDraft(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
  confirmed: ReviewConfirmation[],
  hasPhoto: boolean,
  uiLocale: Locale = defaultLocale,
  messages: AcademicActivityFieldMessages = es.academicActivities.validation,
): FormErrors {
  const errors = validateContent(
    academicActivityContent,
    initial.stored,
    draft.content,
    confirmed,
    uiLocale,
  )

  if (draft.startDate.trim() === '') {
    errors.startDate = messages.startDate
  } else if (draft.endDate.trim() !== '' && draft.endDate < draft.startDate) {
    errors.endDate = messages.endDate
  }

  if (draft.location.trim() === '') errors.location = messages.location
  if (!hasPhoto) errors.photo = messages.photo

  return errors
}

/** The body of `POST /api/academic-activities`. */
export function buildCreateRequest(
  draft: AcademicActivityDraft,
  photoUrl: string,
): Record<string, unknown> {
  return {
    content: toContentInput(academicActivityContent, draft.content),
    startDate: draft.startDate,
    endDate: draft.endDate.trim() === '' ? null : draft.endDate,
    location: draft.location.trim(),
    photoUrl,
  }
}

/**
 * The body of `PATCH /api/academic-activities/[id]`, or `null` when nothing changed. Title,
 * category, description and photo alt text are sent, in both languages, only when one of them
 * changed; otherwise the request is a shared-field update. The dates travel together, only when
 * either changed; the location and the photo, only when they changed.
 */
export function buildUpdateRequest(
  initial: AcademicActivityFormInitial,
  draft: AcademicActivityDraft,
  confirmed: ReviewConfirmation[],
  newPhotoUrl: string | null,
): Record<string, unknown> | null {
  const body: Record<string, unknown> = { version: initial.version }

  if (hasContentChanges(initial, draft)) {
    body.content = toContentInput(academicActivityContent, draft.content)
    const confirmations = reviewsNeeded(initial, draft).filter((review) =>
      isConfirmed(confirmed, review),
    )
    if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  }

  if (datesChanged(initial, draft)) {
    body.startDate = draft.startDate
    body.endDate = draft.endDate.trim() === '' ? null : draft.endDate
  }

  if (locationChanged(initial, draft)) body.location = draft.location.trim()
  if (newPhotoUrl !== null) body.photoUrl = newPhotoUrl

  return Object.keys(body).length > 1 ? body : null
}
