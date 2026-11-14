import { collaborationFieldSchemas, type CollaborationFieldMessages } from './collaboration-schema'
import { collaborationContent, type ResearchCollaboration } from './research-collaborations'
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

export interface CollaborationDraft {
  name: string
  acronym: string
  scope: ResearchCollaboration['scope']
  websiteUrl: string
  logoPath: string
  content: ContentDraft<'country'>
}

export function resolveCollaborationContentDraft(
  record: ResearchCollaboration | undefined,
  content: ContentDraft<'country'>,
): ContentDraft<'country'> {
  if (record?.editing?.isLegacy) {
    return content
  }
  const esCountry = content.es?.country?.trim() ?? ''
  const enCountry = content.en?.country?.trim() ?? ''
  return {
    es: { country: esCountry || enCountry },
    en: { country: enCountry || esCountry },
  }
}

export function collaborationDraft(record?: ResearchCollaboration): CollaborationDraft {
  return {
    name: record?.name ?? '',
    acronym: record?.acronym ?? '',
    scope: record?.scope ?? 'national',
    websiteUrl: record?.websiteUrl ?? '',
    logoPath: record?.logoPath ?? '',
    content: record?.editing
      ? draftFromStored(collaborationContent, record.editing.content)
      : emptyContentDraft(collaborationContent),
  }
}

export function validateCollaborationDraft(
  record: ResearchCollaboration | undefined,
  draft: CollaborationDraft,
  confirmed: ReviewConfirmation<'country'>[],
  locale: Locale,
  messages: CollaborationFieldMessages,
): FormErrors {
  const resolvedContent = resolveCollaborationContentDraft(record, draft.content)
  const errors = validateContent(
    collaborationContent,
    record?.editing?.content ?? null,
    resolvedContent,
    confirmed,
    locale,
  )
  const schemas = collaborationFieldSchemas(messages)
  for (const field of ['name', 'acronym', 'scope', 'websiteUrl', 'logoPath'] as const) {
    const result = schemas[field].safeParse(draft[field])
    if (!result.success) errors[field] = result.error.issues[0]!.message
  }
  return errors
}

export function collaborationRequest(
  record: ResearchCollaboration | undefined,
  initial: CollaborationDraft,
  draft: CollaborationDraft,
  confirmed: ReviewConfirmation<'country'>[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = {}
  for (const key of ['name', 'acronym', 'scope', 'websiteUrl', 'logoPath'] as const) {
    if (!record || initial[key].trim() !== draft[key].trim()) body[key] = draft[key].trim()
  }
  const resolvedContent = resolveCollaborationContentDraft(record, draft.content)
  if (hasContentChanges(collaborationContent, record?.editing?.content ?? null, resolvedContent)) {
    body.content = toContentInput(collaborationContent, resolvedContent)
    if (record) body.confirmedUnchanged = confirmed
  }
  if (!Object.keys(body).length) return null
  if (record) body.version = record.editing?.version
  return body
}
