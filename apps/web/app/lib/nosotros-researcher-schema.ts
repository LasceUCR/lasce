import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
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

/**
 * The fields shared by both languages, each as the editor sends it. `email` is a single form
 * field, a comma separated list of zero, one or two addresses, split and validated into an array
 * here, since a researcher can have more than one (matching `ResearcherCard`'s multi-address
 * display). Capped at 2 by both this schema and a database CHECK constraint.
 */
/** The photo is optional: `''` or a missing value means the researcher has no photo. */
const srcSchema = z.string().trim()
const nameSchema = z.string().trim().min(1, 'El nombre es obligatorio.')
const institutionSchema = z.string().trim().min(1, 'La institución es obligatoria.')
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
  .pipe(
    z
      .array(z.email({ error: 'Uno o más correos no son válidos.' }))
      .max(2, 'Máximo 2 correos de contacto.'),
  )

/** Body of a create request. Both languages are required, and so are the shared fields but the photo. */
export const nosotrosResearcherCreateSchema = z.strictObject({
  content: nosotrosResearcherContent.schema,
  src: srcSchema.optional(),
  name: nameSchema,
  email: emailSchema.optional(),
  institution: institutionSchema,
})

/**
 * Body of an update request. Only the fields present are written.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a bilingual content update, which needs both languages in full;
 *   absent for a shared-field update, which never touches the texts and never asks for a
 *   missing translation.
 * - `confirmedUnchanged`: only with `content`. For a field changed in one language only, the
 *   other language's text must either change too or be listed here, meaning the editor reviewed
 *   it in this operation and it is still correct. Confirmations are never stored.
 */
export const nosotrosResearcherUpdateSchema = z
  .strictObject({
    version: versionSchema(
      'La versión del investigador es obligatoria y debe ser la que se cargó.',
    ),
    content: nosotrosResearcherContent.schema.optional(),
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
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }

    const { version: _version, confirmedUnchanged: _confirmed, ...changes } = input
    if (Object.values(changes).every((value) => value === undefined)) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type NosotrosResearcherCreateInput = z.infer<typeof nosotrosResearcherCreateSchema>
export type NosotrosResearcherUpdateInput = z.infer<typeof nosotrosResearcherUpdateSchema>

/**
 * The bodies as an editor sends them, before the schemas transform them (`email` is still the
 * comma separated text).
 */
export type NosotrosResearcherCreateBody = z.input<typeof nosotrosResearcherCreateSchema>
export type NosotrosResearcherUpdateBody = z.input<typeof nosotrosResearcherUpdateSchema>
