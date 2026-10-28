import {
  initiativeContent,
  initiativeFieldSchemas,
  type InitiativeFieldMessages,
} from './initiative-schema'
import type { CollaborationInitiative } from './collaborations'
import type { Locale } from './i18n/config'
import type { ReviewConfirmation } from './i18n/content/definition'
import {
  draftFromStored,
  emptyContentDraft,
  hasContentChanges,
  toContentInput,
  validateContent,
  type ContentDraft,
  type FormErrors,
} from './i18n/content/form'

export interface InitiativeDraft {
  logoUrl: string
  websiteUrl: string
  content: ContentDraft<'title' | 'description'>
}

export function initiativeDraft(record?: CollaborationInitiative): InitiativeDraft {
  return {
    logoUrl: record?.logo?.src ?? '',
    websiteUrl: record?.href ?? '',
    content: record?.editing
      ? draftFromStored(initiativeContent, record.editing.content)
      : emptyContentDraft(initiativeContent),
  }
}

export function validateInitiativeDraft(
  record: CollaborationInitiative | undefined,
  draft: InitiativeDraft,
  confirmed: ReviewConfirmation<'title' | 'description'>[],
  locale: Locale,
  messages: InitiativeFieldMessages,
): FormErrors {
  const errors = validateContent(
    initiativeContent,
    record?.editing?.content ?? null,
    draft.content,
    confirmed,
    locale,
  )
  const schemas = initiativeFieldSchemas(messages)
  for (const field of ['logoUrl', 'websiteUrl'] as const) {
    const result = schemas[field].safeParse(draft[field])
    if (!result.success) errors[field] = result.error.issues[0]!.message
  }
  return errors
}

export function initiativeRequest(
  record: CollaborationInitiative | undefined,
  initial: InitiativeDraft,
  draft: InitiativeDraft,
  confirmed: ReviewConfirmation<'title' | 'description'>[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = {}
  for (const key of ['logoUrl', 'websiteUrl'] as const) {
    if (!record || initial[key].trim() !== draft[key].trim()) body[key] = draft[key].trim()
  }
  if (hasContentChanges(initiativeContent, record?.editing?.content ?? null, draft.content)) {
    body.content = toContentInput(initiativeContent, draft.content)
    if (record) body.confirmedUnchanged = confirmed
  }
  if (!Object.keys(body).length) return null
  if (record) body.version = record.editing?.version
  return body
}
