import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }
import { versionSchema } from './cms/version'
import { defineTranslatableContent } from './i18n/content/definition'

export const initiativeContent = defineTranslatableContent({
  title: {
    noun: { word: 'título', gender: 'm' },
    nouns: { en: 'title' },
    required: true,
    maxLength: 300,
  },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
    maxLength: 20000,
  },
})

export type InitiativeFieldMessages = typeof es.initiatives.validation

export function initiativeFieldSchemas(messages: InitiativeFieldMessages) {
  const optional = (schema: z.ZodType<string, string>) =>
    z
      .union([z.string(), z.null()])
      .transform((value) => value?.trim() || null)
      .pipe(z.union([z.null(), schema]))
  // These addresses are rendered by the browser; the server never fetches them.
  const url = (message: string) =>
    z
      .url({ protocol: /^https?$/, error: message })
      .max(2048, message)
      .refine((value) => {
        try {
          const parsed = new URL(value)
          return !parsed.username && !parsed.password
        } catch {
          return false
        }
      }, message)
  return {
    websiteUrl: optional(url(messages.websiteUrl)),
    // Keep the existing bundled logos usable, without allowing protocol-relative URLs.
    logoUrl: optional(
      z.union(
        [
          url(messages.logoUrl),
          z.string().regex(/^\/brand\/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|svg)$/i, messages.logoUrl),
        ],
        { error: messages.logoUrl },
      ),
    ),
  }
}

const fields = initiativeFieldSchemas(es.initiatives.validation)

export const initiativeCreateSchema = z.strictObject({
  content: initiativeContent.schema,
  logoUrl: fields.logoUrl.optional().transform((value) => value ?? null),
  websiteUrl: fields.websiteUrl.optional().transform((value) => value ?? null),
})

export const initiativeUpdateSchema = z
  .strictObject({
    ...z.object(fields).partial().shape,
    version: versionSchema('La versión de la iniciativa es obligatoria.'),
    content: initiativeContent.schema.optional(),
    confirmedUnchanged: initiativeContent.confirmationsSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.confirmedUnchanged && !input.content) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones requieren contenido.',
      })
    }
    if (
      input.content === undefined &&
      input.logoUrl === undefined &&
      input.websiteUrl === undefined
    ) {
      ctx.addIssue({ code: 'custom', path: [], message: 'No hay campos para actualizar.' })
    }
  })

export type InitiativeCreateInput = z.infer<typeof initiativeCreateSchema>
export type InitiativeUpdateInput = z.infer<typeof initiativeUpdateSchema>
