import { z } from 'zod'

import { versionSchema } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type LocalizedContent,
  type ReviewConfirmation as ContentReviewConfirmation,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'
import { findPendingReviews as findContentReviews } from '@/app/lib/i18n/content/review'

export { translationLocales, type TranslationLocale } from '@/app/lib/i18n/content/definition'

/**
 * The client-safe half of the gallery module: types, the Zod contracts of the
 * `/api/gallery` endpoints and the bilingual review rule. It imports nothing from the
 * server, so the editor validates with exactly the rules the API enforces. Data access lives in
 * `gallery.ts`, which re-exports everything here.
 *
 * The bilingual parts (content schema, stored content, review rule) come from the shared content
 * core in `app/lib/i18n/content/`.
 */

/**
 * An album's text, written once per language: both fields are required in every locale.
 * Spanish lives on `gallery.gallery_albums`; every other locale in
 * `gallery.gallery_albums_translations`.
 */
export const albumContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'abstract' },
    required: true,
  },
})

type AlbumContentSpecs = typeof albumContent.specs

/** The fields of an album that are written once per language. */
export const translatableFields = albumContent.fields

export type TranslatableField = FieldOf<AlbumContentSpecs>

export type LocalizedAlbumContent = LocalizedContent<AlbumContentSpecs>

/**
 * An album's translatable text in every language, as stored. The source language lives on
 * the base row and is always present; another language is `null` when the record has no
 * translation row for it yet.
 */
export type StoredAlbumContent = StoredContent<AlbumContentSpecs>

/** What an editor needs that a visitor does not: both languages and the version to save against. */
export type AlbumEditingData = {
  content: StoredAlbumContent
  /**
   * True when the record predates translations and lacks a translation row. Its base text is in
   * whatever language it was entered in, which is not necessarily Spanish.
   */
  isLegacy: boolean
  /** Opaque concurrency token. Send it back unchanged as `version` when updating. */
  version: string
}

export type GalleryMedia = {
  id: string
  title: string
  description: string
  /**
   * What the image actually shows, for anyone who cannot see it. Read by the
   * lightbox, where the file is the content; the grid and the album tiles
   * render their images decoratively because a control already names them.
   */
  alt: string
  /** Capture date, already formatted for display in Spanish. */
  date: string
  /** File format as shown to visitors: JPG, JPEG, MP4, PNG… */
  format: string
  uploader: string
  isVideo: boolean
  /** Tile footprint in the masonry grid. */
  colSpan: 1 | 2 | 3 | 4
  rowSpan: 1 | 2 | 3 | 4
  /** Optional: a file still awaiting upload renders the placeholder frame. */
  src?: string
  /** MinIO object key when the media record comes from PostgreSQL. */
  objectKey?: string
}

type AlbumBase = {
  /** Database id, present for records loaded from PostgreSQL. */
  id?: string
  slug: string
  title: string
  description: string
  media: readonly GalleryMedia[]
  src?: string
  /** MinIO object key when the album record comes from PostgreSQL. */
  coverObjectKey?: string
  /**
   * The language `title` and `description` are actually in. `null` when the record is legacy and
   * its base text is shown, because that text's language is unknown.
   */
  contentLocale?: Locale | null
  /** Present only when loaded with `includeEditingData`. */
  editing?: AlbumEditingData
}

export type GallerySubAlbum = AlbumBase & {
  yearsLabel?: string
}

export type GalleryAlbum = AlbumBase & {
  /** Period the album covers, e.g. '2023–2025'. Part of the summary line. */
  years: string
  subAlbums: readonly GallerySubAlbum[]
}

/**
 * Both languages' title and description, trimmed; blank text is rejected. Every supported locale
 * is required, so adding one to `locales` makes its content required too.
 */
export const albumContentSchema = albumContent.schema

export type AlbumContentInput = ContentInput<AlbumContentSpecs>

/** A field whose text in one language is kept as is while its counterpart changed. */
export type ReviewConfirmation = ContentReviewConfirmation<TranslatableField>

export const galleryIdSchema = z.uuid()

/** Fields shared by albums and sub-albums, which are not translated. */
const albumSharedFields = {
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe usar letras minúsculas, números y guiones.'),
  yearsLabel: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  coverObjectKey: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
}

/** Body of a request to create a top-level album. Both languages are required. */
export const albumCreateSchema = z.strictObject({
  content: albumContentSchema,
  ...albumSharedFields,
})

/**
 * Body of a request to create a sub-album under the album in the URL. It has the same shape as an
 * album: a sub-album is an album with a parent.
 */
export const subAlbumCreateSchema = albumCreateSchema

/**
 * Body of an update request, for an album or a sub-album. Every field is optional and only the
 * fields present are written; `null` clears `yearsLabel` and `coverObjectKey`.
 *
 * - `version` (required): the `editing.version` the editor loaded. A save against an older
 *   version is rejected instead of overwriting someone else's change.
 * - `content`: a bilingual content update, which needs both languages in full; absent for an
 *   update of shared fields only.
 * - `confirmedUnchanged`: only with `content`. A translatable field changed in one language only
 *   must either change in the other too or be listed here. Confirmations are never stored.
 */
export const albumUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión del álbum es obligatoria y debe ser la que se cargó.'),
    content: albumContentSchema.optional(),
    confirmedUnchanged: albumContent.confirmationsSchema.optional(),
    ...albumSharedFields,
    slug: albumSharedFields.slug.optional(),
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

export const subAlbumUpdateSchema = albumUpdateSchema

const galleryMediaFields = {
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.'),
  alt: z.string().trim().min(1, 'El texto alternativo es obligatorio.'),
  objectKey: z.string().trim().min(1, 'La clave del archivo es obligatoria.'),
  format: z.string().trim().min(1, 'El formato es obligatorio.'),
  isVideo: z.boolean(),
  colSpan: z.number().int().min(1).max(4),
  rowSpan: z.number().int().min(1).max(4),
  date: z.string().date(),
  uploader: z.string().trim().min(1, 'El nombre de quien subió el archivo es obligatorio.'),
}

/** Body of a request to add a file to an album. `isVideo` and the tile spans have defaults. */
export const galleryMediaInputSchema = z.strictObject({
  ...galleryMediaFields,
  isVideo: galleryMediaFields.isVideo.default(false),
  colSpan: galleryMediaFields.colSpan.default(1),
  rowSpan: galleryMediaFields.rowSpan.default(1),
})

/** Body of a request to edit a file: any field, but at least one. */
export const galleryMediaUpdateSchema = z
  .strictObject(galleryMediaFields)
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe proporcionar al menos un campo para editar.',
  )

export type AlbumCreateInput = z.infer<typeof albumCreateSchema>
export type SubAlbumCreateInput = z.infer<typeof subAlbumCreateSchema>
export type AlbumUpdateInput = z.infer<typeof albumUpdateSchema>
export type SubAlbumUpdateInput = z.infer<typeof subAlbumUpdateSchema>
export type GalleryMediaInput = z.infer<typeof galleryMediaInputSchema>
export type GalleryMediaUpdate = z.infer<typeof galleryMediaUpdateSchema>

/**
 * The translatable fields that changed in some languages but not in others, minus the ones the
 * editor confirmed as still correct in this operation. A language with no stored text yet (a
 * legacy record) counts as changed, so completing a legacy record's English requires reviewing
 * its base text too: that text may not be Spanish at all. The rule itself is the shared one
 * (`app/lib/i18n/content/review.ts`); this binds it to the album's fields.
 */
export function findPendingReviews(
  current: StoredAlbumContent,
  next: AlbumContentInput,
  confirmed: ReviewConfirmation[],
): ReviewConfirmation[] {
  return findContentReviews(albumContent, current, next, confirmed)
}
