import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }
import { versionSchema } from '@/app/lib/cms/version'
import { collaborationContent } from './research-collaborations'

export type CollaborationFieldMessages = typeof es.collaborations.validation

export function collaborationFieldSchemas(messages: CollaborationFieldMessages) {
  const optionalText = (schema: z.ZodType<string, string>) =>
    z
      .union([z.string(), z.null()])
      .transform((value) => value?.trim() || null)
      .pipe(z.union([z.null(), schema]))
  // URLs are rendered directly in the browser, never fetched by the server.
  const url = z
    .url({ protocol: /^https?$/, error: messages.url })
    .max(2048, messages.url)
    .refine((value) => {
      try {
        const parsed = new URL(value)
        return !parsed.username && !parsed.password
      } catch {
        return false
      }
    }, messages.url)
  return {
    name: z.string({ error: messages.name }).trim().min(1, messages.name).max(300, messages.name),
    scope: z.enum(['national', 'international'], { error: messages.scope }),
    acronym: optionalText(z.string().max(100, messages.acronym)),
    websiteUrl: optionalText(url),
  }
}

const fields = collaborationFieldSchemas(es.collaborations.validation)

export const collaborationCreateSchema = z.strictObject({
  ...fields,
  acronym: fields.acronym.optional().transform((value) => value ?? null),
  websiteUrl: fields.websiteUrl.optional().transform((value) => value ?? null),
  content: collaborationContent.schema,
})

export const collaborationUpdateSchema = z
  .strictObject({
    ...z.object(fields).partial().shape,
    version: versionSchema('La versión de la colaboración es obligatoria.'),
    content: collaborationContent.schema.optional(),
    confirmedUnchanged: collaborationContent.confirmationsSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.confirmedUnchanged && !input.content) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones requieren contenido.',
      })
    }
    const { version: _version, confirmedUnchanged: _confirmed, ...changes } = input
    if (Object.values(changes).every((value) => value === undefined)) {
      ctx.addIssue({ code: 'custom', path: [], message: 'No hay campos para actualizar.' })
    }
  })

export type CollaborationCreateInput = z.infer<typeof collaborationCreateSchema>
export type CollaborationUpdateInput = z.infer<typeof collaborationUpdateSchema>
