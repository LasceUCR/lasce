import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }
import { versionSchema } from './cms/version'
import { defineTranslatableContent } from './i18n/content/definition'
import { SCIENTIFIC_TOOL_IMAGE_PATH } from './scientific-tool-image'

/** The tool's name is a product name (SWAAT, SWAPRO): shared by every language. */
export const SCIENTIFIC_TOOL_NAME_MAX_LENGTH = 100
export const SCIENTIFIC_TOOL_URL_MAX_LENGTH = 2048

export const scientificToolContent = defineTranslatableContent({
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
    maxLength: 2000,
  },
})

/** An absolute `https:` address without embedded credentials, within the length limit. */
export function isSafeHttpsUrl(value: string): boolean {
  if (value.length > SCIENTIFIC_TOOL_URL_MAX_LENGTH || !URL.canParse(value)) return false
  const url = new URL(value)
  return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
}

export type ScientificToolField = (typeof scientificToolContent.fields)[number]
export type ScientificToolFieldMessages = typeof es.scientificTools.validation

/** The shared (untranslated) fields, with messages in the language of `messages`. */
export function scientificToolFieldSchemas(messages: ScientificToolFieldMessages) {
  return {
    name: z
      .string({ error: messages.name })
      .trim()
      .min(1, messages.name)
      .max(SCIENTIFIC_TOOL_NAME_MAX_LENGTH, messages.nameTooLong),
    // Opened by the visitor's browser in a new tab; the server never fetches it.
    accessUrl: z
      .string({ error: messages.accessUrl })
      .trim()
      .refine(isSafeHttpsUrl, messages.accessUrl),
    // Only an image uploaded through the CMS; a blank value removes it.
    imageUrl: z
      .union([z.string(), z.null()])
      .transform((value) => value?.trim() || null)
      .pipe(z.union([z.null(), z.string().regex(SCIENTIFIC_TOOL_IMAGE_PATH, messages.imageUrl)])),
  }
}

const fields = scientificToolFieldSchemas(es.scientificTools.validation)

export const scientificToolCreateSchema = z.strictObject({
  name: fields.name,
  content: scientificToolContent.schema,
  accessUrl: fields.accessUrl,
  imageUrl: fields.imageUrl.optional().transform((value) => value ?? null),
})

export const scientificToolUpdateSchema = z
  .strictObject({
    ...z.object(fields).partial().shape,
    version: versionSchema('La versión de la herramienta es obligatoria.'),
    content: scientificToolContent.schema.optional(),
    confirmedUnchanged: scientificToolContent.confirmationsSchema.optional(),
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
      input.name === undefined &&
      input.accessUrl === undefined &&
      input.imageUrl === undefined
    ) {
      ctx.addIssue({ code: 'custom', path: [], message: 'No hay campos para actualizar.' })
    }
  })

export type ScientificToolCreateInput = z.infer<typeof scientificToolCreateSchema>
export type ScientificToolUpdateInput = z.infer<typeof scientificToolUpdateSchema>
