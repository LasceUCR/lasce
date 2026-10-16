import { parseApiError } from '@/app/lib/cms/save'
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
  newsContent,
  newsFieldSchemas,
  type NewsArticle,
  type NewsField,
  type NewsFieldMessages,
  type ReviewConfirmation,
  type StoredNewsContent,
} from './news-schema'

export type { FormErrors } from '@/app/lib/i18n/content/form'

/**
 * The editing logic behind `NewsArticleForm` and `NewsExplorer`, kept free of React so every rule
 * can be tested directly. Validation reuses the API's own Zod schemas, so the editor and
 * `/api/news` cannot disagree about what is valid.
 *
 * The title and abstract are handled by the shared bilingual form helpers
 * (`app/lib/i18n/content/form.ts`), configured with `newsContent`. What stays here is specific to
 * news: the shared fields (source, authors, date, link), the request bodies and the meaning of
 * each API error.
 */

/** Everything the editor holds while someone types. Text is kept as typed; it is trimmed on save. */
export interface NewsDraft {
  content: ContentDraft<NewsField>
  /** Comma-separated, as typed. */
  authors: string
  source: string
  /** `yyyy-mm-dd`, the value of the date input, or `''` for an undated item. */
  publishedAt: string
  externalUrl: string
}

/** What the editor opened with, kept apart from the draft so changes can be detected. */
export interface NewsFormInitial {
  draft: NewsDraft
  /** The stored text in every language; `null` when creating a news item. */
  stored: StoredNewsContent | null
  /** True for an item that predates translations: its base text's language is unknown. */
  isLegacy: boolean
  /** The concurrency token to save against; `null` when creating. */
  version: string | null
}

type SharedField = 'source' | 'authors' | 'publishedAt' | 'externalUrl'

const sharedFields: readonly SharedField[] = ['source', 'authors', 'publishedAt', 'externalUrl']

/** The authors typed as "Ana, Luis", as the list the API takes. */
export function splitAuthors(value: string): string[] {
  return value
    .split(',')
    .map((author) => author.trim())
    .filter((author) => author !== '')
}

/** A blank form for a new news item. */
export function emptyInitial(): NewsFormInitial {
  return {
    draft: {
      content: emptyContentDraft(newsContent),
      authors: '',
      source: '',
      publishedAt: '',
      externalUrl: '',
    },
    stored: null,
    isLegacy: false,
    version: null,
  }
}

/**
 * The form for an existing news item. Its text comes from `editing.content`, so a legacy item opens
 * with its base text on the Spanish tab and an empty English tab: nothing is copied across
 * languages to look like a translation.
 */
export function initialFromArticle(article: NewsArticle): NewsFormInitial {
  // Without editing data, only the text shown is known: treat it as base text with no translation.
  const stored: StoredNewsContent =
    article.editing?.content ?? storedContentFrom(newsContent, article, [])

  return {
    draft: {
      content: draftFromStored(newsContent, stored),
      authors: article.authors,
      source: article.source,
      publishedAt: article.publishedAt ?? '',
      externalUrl: article.href,
    },
    stored,
    isLegacy: article.editing?.isLegacy ?? isLegacyContent(stored),
    version: article.editing?.version ?? null,
  }
}

/** True when any title or abstract differs from what was stored. Always true when creating. */
export function hasContentChanges(initial: NewsFormInitial, draft: NewsDraft): boolean {
  return hasTranslatableChanges(newsContent, initial.stored, draft.content)
}

/**
 * True once anything in the form differs from what it opened with, so closing it would lose work
 * and asks first. Compared as typed: whatever someone typed counts as their work, even a space.
 */
export function hasUnsavedChanges(initial: NewsFormInitial, draft: NewsDraft): boolean {
  return JSON.stringify(initial.draft) !== JSON.stringify(draft)
}

/**
 * The fields to update or confirm because their counterpart changed alone, whether or not they
 * have been confirmed yet. Same rule as the API (`findPendingReviews`).
 */
export function reviewsNeeded(initial: NewsFormInitial, draft: NewsDraft): ReviewConfirmation[] {
  return translatableReviewsNeeded(newsContent, initial.stored, draft.content)
}

function sharedValue(draft: NewsDraft, field: SharedField) {
  switch (field) {
    case 'source':
      return draft.source.trim()
    case 'authors':
      return splitAuthors(draft.authors)
    case 'publishedAt':
      return draft.publishedAt || null
    case 'externalUrl':
      return draft.externalUrl.trim()
  }
}

/** The shared fields that differ from what the form opened with. All of them when creating. */
export function changedSharedFields(initial: NewsFormInitial, draft: NewsDraft): SharedField[] {
  const creating = initial.stored === null

  return sharedFields.filter(
    (field) =>
      creating ||
      JSON.stringify(sharedValue(initial.draft, field)) !==
        JSON.stringify(sharedValue(draft, field)),
  )
}

/**
 * Every problem to show before saving, keyed by field path. Titles and abstracts are checked in
 * both languages when creating or when any of them changed; a shared field is checked when it
 * changed (all of them when creating), so a legacy item can be corrected without touching the
 * fields it already lacks. Messages are in `uiLocale`.
 */
export function validateDraft(
  initial: NewsFormInitial,
  draft: NewsDraft,
  confirmed: ReviewConfirmation[],
  uiLocale: Locale = defaultLocale,
  messages: NewsFieldMessages = es.news.validation,
): FormErrors {
  const errors = validateContent(newsContent, initial.stored, draft.content, confirmed, uiLocale)
  const schemas = newsFieldSchemas(messages)

  for (const field of changedSharedFields(initial, draft)) {
    const result = schemas[field].safeParse(sharedValue(draft, field))
    if (!result.success) errors[field] = result.error.issues[0]?.message ?? messages[field]
  }

  return errors
}

/** The body of `POST /api/news`. */
export function buildCreateRequest(draft: NewsDraft): Record<string, unknown> {
  const body: Record<string, unknown> = { content: toContentInput(newsContent, draft.content) }
  for (const field of sharedFields) body[field] = sharedValue(draft, field)
  return body
}

/**
 * The body of `PATCH /api/news/[id]`, or `null` when nothing changed. Titles and abstracts are
 * sent, in both languages, only when one of them changed; otherwise the request is a shared-field
 * update. Only the shared fields that changed are sent, and only the confirmations this edit still
 * needs.
 */
export function buildUpdateRequest(
  initial: NewsFormInitial,
  draft: NewsDraft,
  confirmed: ReviewConfirmation[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = { version: initial.version }

  if (hasContentChanges(initial, draft)) {
    body.content = toContentInput(newsContent, draft.content)
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

/**
 * The texts of a failed request in the editor's language: the `news.errors` namespace, plus the
 * generic text for a server failure and the request's own fallback ("No se pudo guardar…").
 */
export type NewsFailureMessages = typeof es.news.errors & { server: string; fallback: string }

/**
 * What the error toast says when `/api/news` rejects a request, in the editor's language. The
 * server's own messages are Spanish, so they are shown only to an editor in Spanish; anything
 * else gets the editor's own text. `null` leaves a Spanish editor's toast to `useRequestFeedback`,
 * which shows the server's message for a server failure.
 */
export function describeNewsFailure(
  status: number,
  body: unknown,
  uiLocale: Locale,
  messages: NewsFailureMessages,
): string | null {
  const spanish = uiLocale === defaultLocale

  if (status >= 500) return spanish ? null : messages.server

  const error = parseApiError(body)

  if (status === 401 || status === 403) return messages.forbidden
  if (status === 404) return messages.notFound
  if (error.code === 'conflict') return messages.conflict
  if (error.code === 'duplicate-external-url') return messages.duplicateLink
  if (error.code === 'review-required') return messages.review
  if (!spanish) return error.code?.startsWith('invalid-') ? messages.invalid : messages.fallback

  const details = [...new Set(error.issues.flatMap((issue) => issue.message ?? []))]
  if (!error.message) return details.length > 0 ? details.join(' ') : messages.fallback
  return details.length > 0
    ? `${error.message.replace(/[.:]$/, '')}: ${details.join(' ')}`
    : error.message
}
