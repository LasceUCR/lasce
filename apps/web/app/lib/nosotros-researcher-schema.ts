import { z } from 'zod'

import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }
import { versionSchema } from '@/app/lib/cms/version'
import { defaultLocale, type Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the Nosotros researcher roster: types and the Zod contracts of the
 * `/api/nosotros/researchers` endpoints. It imports nothing from the server, so the editor
 * validates with exactly the rules the API enforces. Data access lives in `nosotros.ts`.
 *
 * Only `role` and `description` are bilingual (`nosotrosResearcherContent`). The photo, name,
 * institution and addresses are shared by both languages.
 */

/**
 * A researcher's text, written once per language. The role is required in every locale; the
 * description is optional and all-or-none: empty in every locale, or filled in every locale.
 * Spanish lives on `nosotros_researchers`; every other locale in
 * `nosotros_researcher_translations`.
 */
export const nosotrosResearcherContent = defineTranslatableContent({
  role: { noun: { word: 'rol', gender: 'm' }, nouns: { en: 'role' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: false,
  },
})

type NosotrosResearcherContentSpecs = typeof nosotrosResearcherContent.specs

export type NosotrosResearcherField = FieldOf<NosotrosResearcherContentSpecs>

/**
 * A researcher's translatable text in every language, as stored. The source language lives on
 * the base row and is always present; another language is `null` when the researcher has no
 * translation row for it yet.
 */
export type StoredNosotrosResearcherContent = StoredContent<NosotrosResearcherContentSpecs>

export type NosotrosResearcherContentInput = ContentInput<NosotrosResearcherContentSpecs>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type NosotrosResearcherEditingData = {
  content: StoredNosotrosResearcherContent
  /**
   * True when the researcher predates translations and lacks a translation row. The base text is
   * in whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export type ResearcherValidationMessages = typeof es.researchers.validation

const validationMessages: Record<Locale, ResearcherValidationMessages> = {
  es: es.researchers.validation,
  en: en.researchers.validation,
}

function createSharedSchemas(messages: ResearcherValidationMessages) {
  const srcSchema = z.string().trim()
  const nameSchema = z.string().trim().min(1, messages.nameRequired)
  const institutionSchema = z.string().trim().min(1, messages.institutionRequired)
  const emailSchema = z
    .string()
    .trim()
    .transform((value) =>
      value === ''
        ? []
        : value
            .split(',')
            .map((address) => address.trim())
            .filter((address) => address !== ''),
    )
    .pipe(z.array(z.email({ error: messages.invalidEmail })).max(2, messages.maxEmails))

  return { srcSchema, nameSchema, institutionSchema, emailSchema }
}

/** Creates the body schema for a create request, localized to `locale`. */
export function getNosotrosResearcherCreateSchema(locale: Locale = defaultLocale) {
  const messages = validationMessages[locale] ?? validationMessages[defaultLocale]
  const { srcSchema, nameSchema, institutionSchema, emailSchema } = createSharedSchemas(messages)

  return z.strictObject({
    content: nosotrosResearcherContent.schemaIn(locale),
    src: srcSchema.optional(),
    name: nameSchema,
    email: emailSchema.optional(),
    institution: institutionSchema,
  })
}

/** Creates the body schema for an update request, localized to `locale`. */
export function getNosotrosResearcherUpdateSchema(locale: Locale = defaultLocale) {
  const messages = validationMessages[locale] ?? validationMessages[defaultLocale]
  const { srcSchema, nameSchema, institutionSchema, emailSchema } = createSharedSchemas(messages)

  return z
    .strictObject({
      version: versionSchema(messages.versionRequired),
      content: nosotrosResearcherContent.schemaIn(locale).optional(),
      confirmedUnchanged: nosotrosResearcherContent.confirmationsSchema.optional(),
      src: srcSchema.optional(),
      name: nameSchema.optional(),
      email: emailSchema.optional(),
      institution: institutionSchema.optional(),
    })
    .superRefine((input, context) => {
      if (input.confirmedUnchanged && !input.content) {
        context.addIssue({
          code: 'custom',
          path: ['confirmedUnchanged'],
          message: messages.confirmationsOnlyWithContent,
        })
      }

      const { version: _version, confirmedUnchanged: _confirmed, ...changes } = input
      if (Object.values(changes).every((value) => value === undefined)) {
        context.addIssue({
          code: 'custom',
          path: [],
          message: messages.noFieldsToUpdate,
        })
      }
    })
}

/** Body of a create request in Spanish. */
export const nosotrosResearcherCreateSchema = getNosotrosResearcherCreateSchema(defaultLocale)

/** Body of an update request in Spanish. */
export const nosotrosResearcherUpdateSchema = getNosotrosResearcherUpdateSchema(defaultLocale)

export type NosotrosResearcherCreateInput = z.infer<typeof nosotrosResearcherCreateSchema>
export type NosotrosResearcherUpdateInput = z.infer<typeof nosotrosResearcherUpdateSchema>

/**
 * The bodies as an editor sends them, before the schemas transform them (`email` is still the
 * comma separated text).
 */
export type NosotrosResearcherCreateBody = z.input<typeof nosotrosResearcherCreateSchema>
export type NosotrosResearcherUpdateBody = z.input<typeof nosotrosResearcherUpdateSchema>
