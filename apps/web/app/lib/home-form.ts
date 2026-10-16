import es from '@/messages/es.json' with { type: 'json' }

import { defaultLocale, isLocale, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  draftFromStored,
  hasContentChanges,
  reviewsNeeded,
  toContentInput,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'

import {
  heroContent,
  indicatorContent,
  indicatorValueSchema,
  type GeomagneticIndicatorData,
  type HeroField,
  type HeroReviewConfirmation,
  type HomeHeroData,
  type IndicatorField,
  type IndicatorFieldMessages,
  type IndicatorReviewConfirmation,
  type StoredHeroContent,
  type StoredIndicatorContent,
} from './home-schema'

/**
 * The home page editors without React: what they open with, whether they changed and the request
 * bodies they send. The bilingual parts are the shared helpers of `app/lib/i18n/content/form.ts`,
 * configured with the home page's definitions; nothing here is copied from another entity. The
 * requests go through `useRequestFeedback`, which reports their outcome in a toast.
 */

export interface HomeEditorLanguage {
  uiLocale: Locale
  validation: IndicatorFieldMessages
}

/** The editors in `uiLocale`, from the `home` namespace of the message catalogue. */
export function homeEditorLanguage(
  uiLocale: string,
  messages: { validation: IndicatorFieldMessages },
): HomeEditorLanguage {
  return {
    uiLocale: isLocale(uiLocale) ? uiLocale : defaultLocale,
    validation: messages.validation,
  }
}

/** A JSON request for `useRequestFeedback`. */
export function jsonRequest(method: 'PATCH' | 'PUT', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** The editors in Spanish, the source language: the default of the functions below. */
export const SPANISH_HOME_EDITOR = homeEditorLanguage(defaultLocale, es.home)

// --- Hero banner -------------------------------------------------------------------------------

export interface HeroFormInitial {
  stored: StoredHeroContent
  isLegacy: boolean
  version: string
  draft: ContentDraft<HeroField>
}

/** What the banner editor opens with, taken once so a refresh behind it changes nothing. */
export function heroInitial(editing: NonNullable<HomeHeroData['editing']>): HeroFormInitial {
  return {
    stored: editing.content,
    isLegacy: editing.isLegacy,
    version: editing.version,
    draft: draftFromStored(heroContent, editing.content),
  }
}

export function heroHasChanges(initial: HeroFormInitial, draft: ContentDraft<HeroField>): boolean {
  return hasContentChanges(heroContent, initial.stored, draft)
}

/**
 * The body of `PATCH /api/home/hero`, or `null` when nothing changed. The banner has no shared
 * fields, so every save carries both languages in full and the confirmations it still needs.
 */
export function buildHeroRequest(
  initial: HeroFormInitial,
  draft: ContentDraft<HeroField>,
  confirmed: readonly HeroReviewConfirmation[],
): Record<string, unknown> | null {
  if (!heroHasChanges(initial, draft)) return null

  const body: Record<string, unknown> = {
    version: initial.version,
    content: toContentInput(heroContent, draft),
  }
  const confirmations = confirmationsStillNeeded(
    confirmed,
    reviewsNeeded(heroContent, initial.stored, draft),
  )
  if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  return body
}

// --- Geomagnetic indices -----------------------------------------------------------------------

export interface IndicatorDraft {
  value: string
  content: ContentDraft<IndicatorField>
}

export interface IndicatorFormInitial {
  stored: StoredIndicatorContent
  isLegacy: boolean
  version: string
  value: string
  draft: IndicatorDraft
}

export function indicatorInitial(
  editing: NonNullable<GeomagneticIndicatorData['editing']>,
): IndicatorFormInitial {
  return {
    stored: editing.content,
    isLegacy: editing.isLegacy,
    version: editing.version,
    value: editing.value,
    draft: { value: editing.value, content: draftFromStored(indicatorContent, editing.content) },
  }
}

export function indicatorContentChanged(
  initial: IndicatorFormInitial,
  draft: IndicatorDraft,
): boolean {
  return hasContentChanges(indicatorContent, initial.stored, draft.content)
}

export function indicatorValueChanged(initial: IndicatorFormInitial, draft: IndicatorDraft) {
  return initial.value.trim() !== draft.value.trim()
}

export function indicatorHasChanges(initial: IndicatorFormInitial, draft: IndicatorDraft) {
  return indicatorValueChanged(initial, draft) || indicatorContentChanged(initial, draft)
}

/** The shared value's problem, in the editor's language, or `null` when it is valid. */
export function validateIndicatorValue(
  value: string,
  language: HomeEditorLanguage = SPANISH_HOME_EDITOR,
): string | null {
  const result = indicatorValueSchema(language.validation).safeParse(value)
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? language.validation.valueRequired)
}

/**
 * The body of `PATCH /api/home/indicators/[id]`, or `null` when nothing changed. The value is
 * sent only when it changed; the description, in every language, only when it changed in one,
 * so a value-only edit never asks for a translation.
 */
export function buildIndicatorRequest(
  initial: IndicatorFormInitial,
  draft: IndicatorDraft,
  confirmed: readonly IndicatorReviewConfirmation[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = { version: initial.version }

  if (indicatorValueChanged(initial, draft)) body.value = draft.value.trim()

  if (indicatorContentChanged(initial, draft)) {
    body.content = toContentInput(indicatorContent, draft.content)
    const confirmations = confirmationsStillNeeded(
      confirmed,
      reviewsNeeded(indicatorContent, initial.stored, draft.content),
    )
    if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  }

  return Object.keys(body).length > 1 ? body : null
}

/**
 * `ids` with `activeId` moved to where `overId` was, as a drop leaves them. The same list when
 * either id is unknown or they are the same: nothing to save.
 */
export function moveIndicator(
  ids: readonly string[],
  activeId: string,
  overId: string | null | undefined,
): string[] {
  const from = ids.indexOf(activeId)
  const to = overId == null ? -1 : ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return [...ids]

  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, activeId)
  return next
}

export type { FormErrors }
