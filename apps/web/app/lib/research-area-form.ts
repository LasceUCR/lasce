import es from '@/messages/es.json' with { type: 'json' }

import { defaultLocale, isLocale, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  draftFromStored,
  emptyContentDraft,
  hasContentChanges,
  reviewsNeeded,
  toContentInput,
  validateContent,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { storedContentFrom } from '@/app/lib/i18n/content/resolve'

import {
  researchAreaContent,
  researchAreaSrcSchema,
  type ResearchArea,
  type ResearchAreaField,
  type ResearchAreaFieldMessages,
  type ResearchAreaReviewConfirmation,
  type StoredResearchAreaContent,
} from './research-area-schema'

/**
 * The research area editor without React: what it opens with, whether it changed, how it is
 * validated and the request bodies it sends. The title and description are handled by the
 * shared bilingual form helpers (`app/lib/i18n/content/form.ts`), configured with
 * `researchAreaContent`; the photograph is the one shared field and stays here.
 */

export type ResearchAreaDraft = ContentDraft<ResearchAreaField>

export interface ResearchAreaEditorLanguage {
  uiLocale: Locale
  validation: ResearchAreaFieldMessages
}

/** The editor in `uiLocale`, from the `researchAreas.validation` messages. */
export function researchAreaEditorLanguage(
  uiLocale: string,
  validation: ResearchAreaFieldMessages,
): ResearchAreaEditorLanguage {
  return { uiLocale: isLocale(uiLocale) ? uiLocale : defaultLocale, validation }
}

/** The editor in Spanish, the source language: the default of the functions below. */
export const SPANISH_RESEARCH_AREA_EDITOR = researchAreaEditorLanguage(
  defaultLocale,
  es.researchAreas.validation,
)

export interface ResearchAreaFormInitial {
  draft: ResearchAreaDraft
  /** The photograph's address, `''` while creating. */
  src: string
  /** Every language as stored, or `null` while creating. */
  stored: StoredResearchAreaContent | null
  isLegacy: boolean
  /** The version to save against, or `null` while creating. */
  version: string | null
}

/** A blank form for a new area. */
export function emptyInitial(): ResearchAreaFormInitial {
  return {
    draft: emptyContentDraft(researchAreaContent),
    src: '',
    stored: null,
    isLegacy: false,
    version: null,
  }
}

/**
 * What an existing area's editor opens with, taken once so a refresh behind it cannot change what
 * it saves against. Each language starts from its own stored text; a language with no text yet
 * starts empty, and nothing is copied across to look like a translation.
 */
export function initialFromArea(area: ResearchArea): ResearchAreaFormInitial {
  // Without editing data, only the text shown is known: treat it as base text with no translation.
  const stored = area.editing?.content ?? storedContentFrom(researchAreaContent, area, [])

  return {
    draft: draftFromStored(researchAreaContent, stored),
    src: area.src ?? '',
    stored,
    isLegacy: area.editing?.isLegacy ?? true,
    version: area.editing?.version ?? null,
  }
}

/**
 * True once any text differs from what the form opened with, as typed: whatever someone typed
 * counts as their work, even a space. The photo is tracked by the form itself.
 */
export function hasUnsavedText(
  initial: ResearchAreaFormInitial,
  draft: ResearchAreaDraft,
): boolean {
  return Object.entries(draft).some(([locale, fields]) =>
    Object.entries(fields).some(
      ([field, value]) =>
        value !== (initial.draft[locale as Locale]?.[field as ResearchAreaField] ?? ''),
    ),
  )
}

/** The cross-language reviews the draft needs, confirmed or not. */
export function reviewsNeededFor(
  initial: ResearchAreaFormInitial,
  draft: ResearchAreaDraft,
): ResearchAreaReviewConfirmation[] {
  return reviewsNeeded(researchAreaContent, initial.stored, draft)
}

/**
 * Every problem with the form, keyed by path (`content.en.title`, `src`), with the API's own rules
 * in the editor's language. The text is not checked while it is unchanged, so a legacy area can
 * get a new photo without being translated.
 */
export function validateDraft(
  initial: ResearchAreaFormInitial,
  draft: ResearchAreaDraft,
  confirmed: readonly ResearchAreaReviewConfirmation[],
  src: string,
  language: ResearchAreaEditorLanguage = SPANISH_RESEARCH_AREA_EDITOR,
): FormErrors {
  const errors = validateContent(
    researchAreaContent,
    initial.stored,
    draft,
    confirmed,
    language.uiLocale,
  )
  const photo = researchAreaSrcSchema(language.validation).safeParse(src)
  if (!photo.success) errors.src = photo.error.issues[0]?.message ?? language.validation.srcRequired
  return errors
}

/** The body of `POST /api/research-areas`. */
export function buildCreateRequest(draft: ResearchAreaDraft, src: string) {
  return { content: toContentInput(researchAreaContent, draft), src }
}

/**
 * The body of `PATCH /api/research-areas/[id]`, or `null` when nothing changed. The text is sent,
 * in every language, only when it changed in one, with the confirmations still needed; the photo
 * only when it changed.
 */
export function buildUpdateRequest(
  initial: ResearchAreaFormInitial,
  draft: ResearchAreaDraft,
  confirmed: readonly ResearchAreaReviewConfirmation[],
  src: string,
): Record<string, unknown> | null {
  const body: Record<string, unknown> = { version: initial.version }

  if (hasContentChanges(researchAreaContent, initial.stored, draft)) {
    body.content = toContentInput(researchAreaContent, draft)
    const confirmations = confirmationsStillNeeded(confirmed, reviewsNeededFor(initial, draft))
    if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  }

  if (src !== initial.src) body.src = src

  return Object.keys(body).length > 1 ? body : null
}
