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
import type { ScientificTool } from './scientific-tool-records'
import {
  scientificToolContent,
  scientificToolFieldSchemas,
  type ScientificToolField,
  type ScientificToolFieldMessages,
} from './scientific-tool-schema'

const sharedFields = ['name', 'accessUrl', 'imageUrl'] as const

export interface ScientificToolDraft {
  name: string
  accessUrl: string
  imageUrl: string
  content: ContentDraft<ScientificToolField>
}

export function scientificToolDraft(tool?: ScientificTool): ScientificToolDraft {
  return {
    name: tool?.name ?? '',
    accessUrl: tool?.href ?? '',
    imageUrl: tool?.imageUrl ?? '',
    content: tool?.editing
      ? draftFromStored(scientificToolContent, tool.editing.content)
      : emptyContentDraft(scientificToolContent),
  }
}

/** The API's rules, run in the editor to point at each invalid field and language early. */
export function validateScientificToolDraft(
  tool: ScientificTool | undefined,
  draft: ScientificToolDraft,
  confirmed: ReviewConfirmation<ScientificToolField>[],
  locale: Locale,
  messages: ScientificToolFieldMessages,
): FormErrors {
  const errors = validateContent(
    scientificToolContent,
    tool?.editing?.content ?? null,
    draft.content,
    confirmed,
    locale,
  )
  const schemas = scientificToolFieldSchemas(messages)
  const initial = scientificToolDraft(tool)
  for (const field of sharedFields) {
    // An edit sends only the fields it changed, so only those are checked again.
    if (tool && initial[field].trim() === draft[field].trim()) continue
    const result = schemas[field].safeParse(draft[field])
    if (!result.success) errors[field] = result.error.issues[0]!.message
  }
  return errors
}

/**
 * The request body: every field on create; on edit only what changed, plus the version.
 * `null` when an edit changed nothing.
 */
export function scientificToolRequest(
  tool: ScientificTool | undefined,
  initial: ScientificToolDraft,
  draft: ScientificToolDraft,
  confirmed: ReviewConfirmation<ScientificToolField>[],
): Record<string, unknown> | null {
  const body: Record<string, unknown> = {}
  for (const key of sharedFields) {
    if (!tool || initial[key].trim() !== draft[key].trim()) body[key] = draft[key].trim()
  }
  if (hasContentChanges(scientificToolContent, tool?.editing?.content ?? null, draft.content)) {
    body.content = toContentInput(scientificToolContent, draft.content)
    if (tool) body.confirmedUnchanged = confirmed
  }
  if (!Object.keys(body).length) return null
  if (tool) body.version = tool.editing?.version
  return body
}
