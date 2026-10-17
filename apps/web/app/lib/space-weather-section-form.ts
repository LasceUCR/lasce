import {
  confirmationsStillNeeded,
  draftFromStored,
  hasContentChanges,
  reviewsNeeded,
  toContentInput,
  type ContentDraft,
} from '@/app/lib/i18n/content/form'

import {
  spaceWeatherSectionContent,
  type SpaceWeatherSectionEditingData,
  type SpaceWeatherSectionField,
  type SpaceWeatherSectionReviewConfirmation,
  type StoredSpaceWeatherSectionContent,
} from './space-weather-section-schema'

export { jsonRequest } from './home-form'

/**
 * The space weather card's editor without React: what it opens with, whether it changed and the
 * request body it sends. The bilingual parts are the shared helpers of
 * `app/lib/i18n/content/form.ts`, configured with the card's definition. The request goes through
 * `useRequestFeedback`, which reports its outcome in a toast.
 */

export type SpaceWeatherSectionDraft = ContentDraft<SpaceWeatherSectionField>

export interface SpaceWeatherSectionFormInitial {
  stored: StoredSpaceWeatherSectionContent
  isLegacy: boolean
  version: string
  draft: SpaceWeatherSectionDraft
}

/**
 * What the editor opens with, taken once so a refresh behind it changes nothing. A legacy section
 * opens with its base text on the Spanish tab and an empty English tab: nothing is copied across
 * languages to look like a translation.
 */
export function sectionInitial(
  editing: SpaceWeatherSectionEditingData,
): SpaceWeatherSectionFormInitial {
  return {
    stored: editing.content,
    isLegacy: editing.isLegacy,
    version: editing.version,
    draft: draftFromStored(spaceWeatherSectionContent, editing.content),
  }
}

export function sectionHasChanges(
  initial: SpaceWeatherSectionFormInitial,
  draft: SpaceWeatherSectionDraft,
): boolean {
  return hasContentChanges(spaceWeatherSectionContent, initial.stored, draft)
}

/**
 * The body of `PATCH /api/space-weather/costa-rica`, or `null` when nothing changed. The card has
 * no shared fields, so every save carries both languages in full and the confirmations it still
 * needs.
 */
export function buildSectionRequest(
  initial: SpaceWeatherSectionFormInitial,
  draft: SpaceWeatherSectionDraft,
  confirmed: readonly SpaceWeatherSectionReviewConfirmation[],
): Record<string, unknown> | null {
  if (!sectionHasChanges(initial, draft)) return null

  const body: Record<string, unknown> = {
    version: initial.version,
    content: toContentInput(spaceWeatherSectionContent, draft),
  }
  const confirmations = confirmationsStillNeeded(
    confirmed,
    reviewsNeeded(spaceWeatherSectionContent, initial.stored, draft),
  )
  if (confirmations.length > 0) body.confirmedUnchanged = confirmations
  return body
}
