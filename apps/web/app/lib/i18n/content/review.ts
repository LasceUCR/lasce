import { locales, type Locale } from '@/app/lib/i18n/config'

import type { ReviewConfirmation, TranslatableFieldSpec } from './definition'
import { reviewCopy } from './messages'

/**
 * The cross-language review rule. When a translatable field changes in some locales but not in
 * others, each unchanged locale must either change too or be confirmed by the editor, in the same
 * operation, as still correct. Confirmations are never stored, so the next edit asks again.
 *
 * The functions take plain values rather than an entity type, so the API (validated input
 * against stored content) and the editor (a draft of strings against what it opened with) run
 * the same rule. The field names are inferred from the definition only (`NoInfer`), so the
 * values passed alongside it are checked against the definition rather than widening it.
 */

/** The part of a definition the review reads. Every `TranslatableContent` has it. */
export interface ReviewedFields<F extends string> {
  readonly fields: readonly F[]
  readonly specs: { readonly [K in F]: TranslatableFieldSpec }
}

/** Text per locale, as submitted or drafted. Optional fields may be `null`. */
export type ContentValues<F extends string> = {
  readonly [L in Locale]: { readonly [K in F]: string | null }
}

/** Text per locale, as stored. A locale without a translation row is `null`. */
export type StoredValues<F extends string> = {
  readonly [L in Locale]: { readonly [K in F]: string | null } | null
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim()
}

export function sameReview(a: ReviewConfirmation, b: ReviewConfirmation): boolean {
  return a.locale === b.locale && a.field === b.field
}

/**
 * The locales whose `field` differs from what is stored, ignoring surrounding whitespace and
 * treating `null` as empty. A locale with no stored text counts as changed, and so does every
 * locale when nothing is stored yet (`stored` is `null` while creating).
 */
export function changedLocales<F extends string>(
  field: NoInfer<F>,
  stored: StoredValues<F> | null,
  next: ContentValues<F>,
): Locale[] {
  return locales.filter((locale) => {
    const before = stored?.[locale]
    return !before || normalize(before[field]) !== normalize(next[locale][field])
  })
}

/**
 * The reviews `next` still needs: for each field changed in some locales but not all, every
 * unchanged locale that is not in `confirmed`.
 *
 * - A locale with no stored text counts as changed. Completing a legacy record therefore asks
 *   to review its base text, which predates languages and may not be in the default locale.
 * - A field empty in every locale of `next` needs no review: there is no text to keep in step.
 *   Only optional fields can get here; a blank required field fails validation first.
 */
export function findPendingReviews<F extends string>(
  definition: { readonly fields: readonly F[] },
  stored: StoredValues<NoInfer<F>>,
  next: ContentValues<NoInfer<F>>,
  confirmed: readonly ReviewConfirmation<NoInfer<F>>[] = [],
): ReviewConfirmation<F>[] {
  const pending: ReviewConfirmation<F>[] = []

  for (const field of definition.fields) {
    if (locales.every((locale) => normalize(next[locale][field]) === '')) continue

    const changed = changedLocales(field, stored, next)
    if (changed.length === 0 || changed.length === locales.length) continue

    for (const locale of locales) {
      if (changed.includes(locale)) continue

      const review = { locale, field }
      if (!confirmed.some((confirmation) => sameReview(confirmation, review))) {
        pending.push(review)
      }
    }
  }

  return pending
}

/**
 * Why `review` needs attention, in Spanish. When the changed locales had no stored text yet (a
 * legacy record getting its translations), nothing in them "changed": the message says instead
 * that the text being reviewed may not be in its locale at all.
 */
export function reviewMessage<F extends string>(
  definition: ReviewedFields<F>,
  review: ReviewConfirmation<NoInfer<F>>,
  stored: StoredValues<NoInfer<F>> | null,
  next: ContentValues<NoInfer<F>>,
): string {
  const { noun } = definition.specs[review.field]
  const others = locales.filter((locale) => locale !== review.locale)
  const changedOthers = changedLocales(review.field, stored, next).filter((locale) =>
    others.includes(locale),
  )
  // Asked about a review that is not pending, name every other locale rather than none.
  const changed = changedOthers.length > 0 ? changedOthers : others
  const added = changed.filter((locale) => stored !== null && stored[locale] === null)

  return added.length > 0
    ? reviewCopy.versionAdded(noun, review.locale, added)
    : reviewCopy.counterpartChanged(noun, review.locale, changed)
}

/** The label of the switch that confirms `review`. */
export function confirmationLabel<F extends string>(
  definition: ReviewedFields<F>,
  review: ReviewConfirmation<NoInfer<F>>,
): string {
  return reviewCopy.confirmation(definition.specs[review.field].noun, review.locale)
}
