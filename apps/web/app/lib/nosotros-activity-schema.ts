import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the "¿Qué hacemos?" cards: types and the Zod contracts of the
 * `/api/nosotros/activities` endpoints. It imports nothing from the server, so the editor
 * validates with exactly the rules the API enforces. Data access lives in `nosotros.ts`.
 *
 * The bilingual parts come from the shared content core in `app/lib/i18n/content/`, configured by
 * `nosotrosActivityContent`. The card's `description` is stored in the `paragraph` column.
 */

export const nosotrosCardIcons = [
  'sun',
  'waves',
  'satellite',
  'code',
  'collaboration',
  'education',
] as const

export type NosotrosCardIcon = (typeof nosotrosCardIcons)[number]

/**
 * A card's text, written once per language: both fields are required in every locale. Spanish
 * lives on `nosotros_activities`; every other locale in `nosotros_activity_translations`.
 */
export const nosotrosActivityContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

type NosotrosActivityContentSpecs = typeof nosotrosActivityContent.specs

export type NosotrosActivityField = FieldOf<NosotrosActivityContentSpecs>

/**
 * A card's translatable text in every language, as stored. The source language lives on the base
 * row and is always present; another language is `null` when the card has no translation row for
 * it yet.
 */
export type StoredNosotrosActivityContent = StoredContent<NosotrosActivityContentSpecs>

export type NosotrosActivityContentInput = ContentInput<NosotrosActivityContentSpecs>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type NosotrosActivityEditingData = {
  content: StoredNosotrosActivityContent
  /**
   * True when the card predates translations and lacks a translation row. Its base text is in
   * whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export const nosotrosActivityIconSchema = z.enum(nosotrosCardIcons, {
  error: 'Seleccione un ícono válido.',
})

/** Body of a create request. Both languages are required, and so is the icon. */
export const nosotrosActivityCreateSchema = z.strictObject({
  icon: nosotrosActivityIconSchema,
  content: nosotrosActivityContent.schema,
})

/**
 * Body of an update request. Only the fields present are written.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a bilingual content update, which needs both languages in full;
 *   absent for an icon-only update, which never touches the texts and never asks for a missing
 *   translation.
 * - `confirmedUnchanged`: only with `content`. For a field changed in one language only, the
 *   other language's text must either change too or be listed here, meaning the editor reviewed
 *   it in this operation and it is still correct. Confirmations are never stored.
 */
export const nosotrosActivityUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión de la actividad es obligatoria y debe ser la que se cargó.'),
    content: nosotrosActivityContent.schema.optional(),
    confirmedUnchanged: nosotrosActivityContent.confirmationsSchema.optional(),
    icon: nosotrosActivityIconSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }

    if (input.content === undefined && input.icon === undefined) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type NosotrosActivityCreateInput = z.infer<typeof nosotrosActivityCreateSchema>
export type NosotrosActivityUpdateInput = z.infer<typeof nosotrosActivityUpdateSchema>
