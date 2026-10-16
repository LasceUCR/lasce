import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type ReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the home page's CMS: what is translatable, the Zod contracts of the
 * `/api/home` endpoints and the types the page and its editors share. It imports nothing from the
 * server, so the editors validate with exactly the rules the API enforces. Data access lives in
 * `home.ts`.
 *
 * Only two things on the home page are editable, and neither can be added or removed:
 *
 * - the hero banner's title and subtitle (`lead`), both translatable;
 * - each geomagnetic index's `value` (shared: "-12 nT" reads the same in every language) and its
 *   `description` (translatable), both at most `INDICATOR_TEXT_MAX` characters. The indices can
 *   also be reordered.
 *
 * Labels ("Índice Kp"), the call to action and the demonstration notice are fixed copy and stay in
 * the message catalogue (docs/translate-database-content.md, step 1).
 */

/** The longest value or description an index card holds, after trimming. */
export const INDICATOR_TEXT_MAX = 15

export const heroContent = defineTranslatableContent({
  title: {
    noun: { word: 'título', gender: 'm' },
    nouns: { en: 'title' },
    required: true,
    maxLength: 120,
  },
  lead: {
    noun: { word: 'subtítulo', gender: 'm' },
    nouns: { en: 'subtitle' },
    required: true,
    maxLength: 300,
  },
})

export const indicatorContent = defineTranslatableContent({
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
    maxLength: INDICATOR_TEXT_MAX,
  },
})

export type HeroField = FieldOf<typeof heroContent.specs>
export type IndicatorField = FieldOf<typeof indicatorContent.specs>
export type StoredHeroContent = StoredContent<typeof heroContent.specs>
export type StoredIndicatorContent = StoredContent<typeof indicatorContent.specs>
export type HeroContentInput = ContentInput<typeof heroContent.specs>
export type IndicatorContentInput = ContentInput<typeof indicatorContent.specs>

/** The codes the seeded indices carry. Each one names its label and tone in the catalogue. */
export const indicatorCodes = ['kp', 'dst', 'ae', 'ap'] as const

export type IndicatorCode = (typeof indicatorCodes)[number]

export type IndicatorTone = 'teal' | 'cyan' | 'blue'

/** The accent each index's card is drawn with. */
export const indicatorTones: Record<IndicatorCode, IndicatorTone> = {
  kp: 'teal',
  dst: 'cyan',
  ae: 'blue',
  ap: 'teal',
}

export function isIndicatorCode(value: string): value is IndicatorCode {
  return (indicatorCodes as readonly string[]).includes(value)
}

/** What an editor needs that a visitor does not: every language and the version to save against. */
export interface EditingData<C> {
  content: C
  /** True while a translation row is missing: the base text's language is then unknown. */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version`. */
  version: string
}

export interface HomeHeroData {
  title: string
  lead: string
  /**
   * The language `title` and `lead` are in; `null` for a legacy record's base text. Absent for the
   * catalogue's fallback text, which is in the page's language.
   */
  contentLocale?: Locale | null
  /** Present only when loaded for an editor. */
  editing?: EditingData<StoredHeroContent>
}

export interface GeomagneticIndicatorData {
  id: string
  code: IndicatorCode
  value: string
  description: string
  /** The display order, from the `position` column. */
  position: number
  /** As on `HomeHeroData`: absent for the catalogue's fallback text. */
  contentLocale?: Locale | null
  editing?: EditingData<StoredIndicatorContent> & {
    /** The shared value as stored, so the editor can tell whether it changed. */
    value: string
  }
}

/**
 * The messages of the shared `value` rule, from `home.validation` in `apps/web/messages/`. The
 * API uses the Spanish ones; an editor builds the rule with the messages of the site's language.
 */
export type IndicatorFieldMessages = typeof es.home.validation

export function indicatorValueSchema(messages: IndicatorFieldMessages) {
  return z
    .string({ error: messages.valueNotText })
    .trim()
    .min(1, messages.valueRequired)
    .max(INDICATOR_TEXT_MAX, messages.valueTooLong)
}

const valueSchema = indicatorValueSchema(es.home.validation)

const confirmationsOnlyWithContent =
  'Las confirmaciones solo aplican a una actualización de contenido (content).'

/**
 * Body of `PATCH /api/home/hero`. The banner has no shared fields, so `content` (every language,
 * in full) is required. `confirmedUnchanged` lists the fields whose text in one language is kept
 * while the other changed, reviewed in this edit; confirmations are never stored.
 */
export const heroUpdateSchema = z.strictObject({
  version: versionSchema('La versión de la portada es obligatoria y debe ser la que se cargó.'),
  content: heroContent.schema,
  confirmedUnchanged: heroContent.confirmationsSchema.optional(),
})

/**
 * Body of `PATCH /api/home/indicators/[id]`. Only the fields present are written: `value` alone
 * is a shared-field update that never touches the translations; `content` carries the
 * description in every language.
 */
export const indicatorUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión del índice es obligatoria y debe ser la que se cargó.'),
    value: valueSchema.optional(),
    content: indicatorContent.schema.optional(),
    confirmedUnchanged: indicatorContent.confirmationsSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: confirmationsOnlyWithContent,
      })
    }

    if (input.value === undefined && input.content === undefined) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

/**
 * Body of `PUT /api/home/indicators`: every index id, once, in the new display order, and the
 * position column to write it to (`position` when absent).
 */
/**
 * The columns of `geomagnetic_indices` that hold a display order, by the name a reorder request
 * gives (`EditableWrapper`'s `positionField`). Only these can be written by a reorder: the name
 * comes from the browser, so it is checked here rather than trusted.
 */
export const indicatorPositionFields = ['position'] as const

export type IndicatorPositionField = (typeof indicatorPositionFields)[number]

export const indicatorOrderSchema = z.strictObject({
  positionField: z
    .enum(indicatorPositionFields, {
      error: 'El campo de posición no existe en los índices geomagnéticos.',
    })
    .default('position'),
  ids: z
    .array(z.uuid({ error: 'Cada identificador de índice debe ser un UUID.' }), {
      error: 'El orden (ids) debe ser una lista de identificadores.',
    })
    .min(1, 'El orden debe incluir al menos un índice.')
    .refine((ids) => new Set(ids).size === ids.length, 'El orden no puede repetir un índice.'),
})

export type HeroUpdateInput = z.infer<typeof heroUpdateSchema>
export type IndicatorUpdateInput = z.infer<typeof indicatorUpdateSchema>
export type IndicatorOrderInput = z.infer<typeof indicatorOrderSchema>
export type HeroReviewConfirmation = ReviewConfirmation<HeroField>
export type IndicatorReviewConfirmation = ReviewConfirmation<IndicatorField>
