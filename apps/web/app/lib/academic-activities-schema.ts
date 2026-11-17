import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type ReviewConfirmation as ContentReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

export { translationLocales } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of academic activities: types and the Zod contracts of the
 * `/api/academic-activities` endpoints. It imports nothing from the server, so the editor
 * validates with exactly the rules the API enforces. Data access lives in `academic-activities.ts`.
 *
 * `title`, `category`, `description` and `photoAlt` are bilingual, handled by the shared content
 * core in `app/lib/i18n/content/`. `startDate`, `endDate`, `location` and `photoUrl` are shared
 * and written once.
 */
export const academicActivityContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  category: {
    noun: { word: 'categoría', gender: 'f' },
    nouns: { en: 'category' },
    required: true,
  },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
  photoAlt: {
    noun: { word: 'texto alternativo de la imagen', gender: 'm' },
    nouns: { en: 'image alt text' },
    required: true,
  },
})

type AcademicActivityContentSpecs = typeof academicActivityContent.specs

export type AcademicActivityField = FieldOf<AcademicActivityContentSpecs>

/**
 * An activity's translatable text in every language, as stored. Spanish lives on the base row
 * and is always present; English is `null` while the activity has no translation row for it.
 */
export type StoredAcademicActivityContent = StoredContent<AcademicActivityContentSpecs>

export type AcademicActivityContentInput = ContentInput<AcademicActivityContentSpecs>

/** A field kept as is in one language while its counterpart changed. */
export type ReviewConfirmation = ContentReviewConfirmation<AcademicActivityField>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type AcademicActivityEditingData = {
  content: StoredAcademicActivityContent
  /**
   * True when the activity predates translations and lacks a translation row. Its base text is
   * in whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

const startDateSchema = z.string().date('La fecha de inicio es obligatoria.')
/** `.date()` on `null` input needs a nullable wrapper, not a second message. */
const endDateSchema = z.string().date('La fecha de finalización no es válida.').nullable()
const locationSchema = z.string().trim().min(1, 'La ubicación es obligatoria.')
const photoUrlSchema = z.string().trim().min(1, 'La imagen es obligatoria.')

const DATE_RANGE_MESSAGE =
  'La fecha de finalización debe ser igual o posterior a la fecha de inicio.'

function endsBeforeStart(data: { startDate: string; endDate: string | null }): boolean {
  return data.endDate !== null && data.endDate < data.startDate
}

/** Body of a create request. Both languages, the dates, the location and the photo are required. */
export const academicActivityCreateSchema = z
  .strictObject({
    content: academicActivityContent.schema,
    startDate: startDateSchema,
    endDate: endDateSchema,
    location: locationSchema,
    photoUrl: photoUrlSchema,
  })
  .refine((data) => !endsBeforeStart(data), { message: DATE_RANGE_MESSAGE, path: ['endDate'] })

/**
 * Body of an update request.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: present for a bilingual content update, which needs both languages in full;
 *   absent for a shared-field-only update, which never touches the texts.
 * - `confirmedUnchanged`: only with `content`. For a field changed in one language only, the
 *   other language's text must either change too or be listed here.
 * - `startDate`/`endDate` always travel together: sending one without the other would leave the
 *   range checked against a value already on the row instead of the one just submitted, so an
 *   update either leaves both dates alone or sends both.
 */
export const academicActivityUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión de la actividad es obligatoria y debe ser la que se cargó.'),
    content: academicActivityContent.schema.optional(),
    confirmedUnchanged: academicActivityContent.confirmationsSchema.optional(),
    startDate: startDateSchema.optional(),
    endDate: endDateSchema.optional(),
    location: locationSchema.optional(),
    photoUrl: photoUrlSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }

    const datesTravelAlone = (input.startDate === undefined) !== (input.endDate === undefined)
    if (datesTravelAlone) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Envíe la fecha de inicio y la de finalización juntas.',
      })
    } else if (
      input.startDate !== undefined &&
      input.endDate !== undefined &&
      endsBeforeStart({ startDate: input.startDate, endDate: input.endDate })
    ) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: DATE_RANGE_MESSAGE })
    }

    if (
      input.content === undefined &&
      input.startDate === undefined &&
      input.endDate === undefined &&
      input.location === undefined &&
      input.photoUrl === undefined
    ) {
      context.addIssue({ code: 'custom', path: [], message: 'La solicitud no incluye cambios.' })
    }
  })

export type AcademicActivityCreateInput = z.infer<typeof academicActivityCreateSchema>
export type AcademicActivityUpdateInput = z.infer<typeof academicActivityUpdateSchema>
