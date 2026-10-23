import { z } from 'zod'

import type { Locale } from '@/app/lib/i18n/config'
import { versionSchema } from '@/app/lib/cms/version'
import {
  defineTranslatableContent,
  type ContentInput,
  type FieldOf,
  type StoredContent,
} from '@/app/lib/i18n/content/definition'

export const rosacCardIcons = [
  'antenna',
  'location',
  'frequency',
  'sun',
  'tracking',
  'control',
  'receiver',
  'maintenance',
  'education',
] as const

export type RosacCardIcon = (typeof rosacCardIcons)[number]

export const rosacCardIconSchema = z.enum(rosacCardIcons, {
  error: 'Seleccione un ícono válido.',
})

// 1. Characteristics
export const rosacCharacteristicContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type RosacCharacteristicContentSpecs = typeof rosacCharacteristicContent.specs
export type RosacCharacteristicField = FieldOf<RosacCharacteristicContentSpecs>
export type StoredRosacCharacteristicContent = StoredContent<RosacCharacteristicContentSpecs>
export type RosacCharacteristicContentInput = ContentInput<RosacCharacteristicContentSpecs>

export interface RosacCharacteristicEditingData {
  content: StoredRosacCharacteristicContent
  isLegacy: boolean
  version: string
}

export const rosacCharacteristicUpdateSchema = z
  .strictObject({
    version: versionSchema(
      'La versión de la característica es obligatoria y debe ser la que se cargó.',
    ),
    content: rosacCharacteristicContent.schema.optional(),
    confirmedUnchanged: rosacCharacteristicContent.confirmationsSchema.optional(),
    icon: rosacCardIconSchema.optional(),
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

export type RosacCharacteristicUpdateInput = z.infer<typeof rosacCharacteristicUpdateSchema>

export interface RosacCharacteristicItem {
  id: string
  icon: RosacCardIcon
  title: string
  description: string
  contentLocale?: Locale | null
  editing?: RosacCharacteristicEditingData
}

// 2. Activities
export const rosacActivityContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type RosacActivityContentSpecs = typeof rosacActivityContent.specs
export type RosacActivityField = FieldOf<RosacActivityContentSpecs>
export type StoredRosacActivityContent = StoredContent<RosacActivityContentSpecs>
export type RosacActivityContentInput = ContentInput<RosacActivityContentSpecs>

export interface RosacActivityEditingData {
  content: StoredRosacActivityContent
  isLegacy: boolean
  version: string
}

export const rosacActivityUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión de la actividad es obligatoria y debe ser la que se cargó.'),
    content: rosacActivityContent.schema.optional(),
    confirmedUnchanged: rosacActivityContent.confirmationsSchema.optional(),
    icon: rosacCardIconSchema.optional(),
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

export type RosacActivityUpdateInput = z.infer<typeof rosacActivityUpdateSchema>

export interface RosacActivityItem {
  id: string
  icon: RosacCardIcon
  title: string
  description: string
  contentLocale?: Locale | null
  editing?: RosacActivityEditingData
}

// 3. Stages
export const rosacStageContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type RosacStageContentSpecs = typeof rosacStageContent.specs
export type RosacStageField = FieldOf<RosacStageContentSpecs>
export type StoredRosacStageContent = StoredContent<RosacStageContentSpecs>
export type RosacStageContentInput = ContentInput<RosacStageContentSpecs>

export interface RosacStageEditingData {
  content: StoredRosacStageContent
  isLegacy: boolean
  version: string
}

export const rosacStageImageSchema = z.object({
  src: z.string().trim().min(1, 'La ruta de la imagen es obligatoria.'),
  alt: z.string().trim().min(1, 'El texto alternativo es obligatorio.'),
})

export const rosacStageUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión de la etapa es obligatoria y debe ser la que se cargó.'),
    content: rosacStageContent.schema.optional(),
    confirmedUnchanged: rosacStageContent.confirmationsSchema.optional(),
    images: z
      .array(rosacStageImageSchema)
      .min(1, 'La etapa debe contener al menos una fotografía.')
      .optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }
    if (input.content === undefined && input.images === undefined) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type RosacStageUpdateInput = z.infer<typeof rosacStageUpdateSchema>

// 4. Instruments
export const rosacInstrumentContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, nouns: { en: 'name' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type RosacInstrumentContentSpecs = typeof rosacInstrumentContent.specs
export type RosacInstrumentField = FieldOf<RosacInstrumentContentSpecs>
export type StoredRosacInstrumentContent = StoredContent<RosacInstrumentContentSpecs>
export type RosacInstrumentContentInput = ContentInput<RosacInstrumentContentSpecs>

export interface RosacInstrumentEditingData {
  content: StoredRosacInstrumentContent
  isLegacy: boolean
  version: string
}

export const rosacInstrumentSharedSchema = z.object({
  image: z
    .object({
      src: z.string().trim().min(1),
      alt: z.string().trim().min(1),
    })
    .optional(),
  consultation: z
    .object({
      href: z.string().trim().optional(),
      label: z.string().trim().min(1),
    })
    .optional(),
})

export const rosacInstrumentCreateSchema = z.strictObject({
  content: rosacInstrumentContent.schema,
  image: rosacInstrumentSharedSchema.shape.image,
  consultation: rosacInstrumentSharedSchema.shape.consultation,
})

export const rosacInstrumentUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión del instrumento es obligatoria y debe ser la que se cargó.'),
    content: rosacInstrumentContent.schema.optional(),
    confirmedUnchanged: rosacInstrumentContent.confirmationsSchema.optional(),
    image: rosacInstrumentSharedSchema.shape.image,
    consultation: rosacInstrumentSharedSchema.shape.consultation,
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }
    if (
      input.content === undefined &&
      input.image === undefined &&
      input.consultation === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type RosacInstrumentCreateInput = z.infer<typeof rosacInstrumentCreateSchema>
export type RosacInstrumentUpdateInput = z.infer<typeof rosacInstrumentUpdateSchema>

// 5. Acknowledgments
export const rosacAcknowledgmentContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, nouns: { en: 'name' }, required: true },
})

export type RosacAcknowledgmentContentSpecs = typeof rosacAcknowledgmentContent.specs
export type RosacAcknowledgmentField = FieldOf<RosacAcknowledgmentContentSpecs>
export type StoredRosacAcknowledgmentContent = StoredContent<RosacAcknowledgmentContentSpecs>
export type RosacAcknowledgmentContentInput = ContentInput<RosacAcknowledgmentContentSpecs>

export interface RosacAcknowledgmentEditingData {
  content: StoredRosacAcknowledgmentContent
  isLegacy: boolean
  version: string
}

export const rosacAcknowledgmentSharedSchema = z.object({
  href: z.string().trim().optional(),
  logo: z.object({
    src: z.string().trim().min(1, 'El logo es obligatorio.'),
    alt: z.string().trim().min(1, 'El texto alternativo del logo es obligatorio.'),
  }),
})

export const rosacAcknowledgmentCreateSchema = z.strictObject({
  content: rosacAcknowledgmentContent.schema,
  href: rosacAcknowledgmentSharedSchema.shape.href,
  logo: rosacAcknowledgmentSharedSchema.shape.logo,
})

export const rosacAcknowledgmentUpdateSchema = z
  .strictObject({
    version: versionSchema(
      'La versión del agradecimiento es obligatoria y debe ser la que se cargó.',
    ),
    content: rosacAcknowledgmentContent.schema.optional(),
    confirmedUnchanged: rosacAcknowledgmentContent.confirmationsSchema.optional(),
    href: rosacAcknowledgmentSharedSchema.shape.href,
    logo: rosacAcknowledgmentSharedSchema.shape.logo.optional(),
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }
    if (input.content === undefined && input.href === undefined && input.logo === undefined) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type RosacAcknowledgmentCreateInput = z.infer<typeof rosacAcknowledgmentCreateSchema>
export type RosacAcknowledgmentUpdateInput = z.infer<typeof rosacAcknowledgmentUpdateSchema>

export interface RosacAcknowledgment {
  id?: string
  name: string
  href?: string
  logo: { src: string; alt: string }
  contentLocale?: Locale | null
  editing?: RosacAcknowledgmentEditingData
}

// 6. Researchers (ROSAC team)
export const rosacResearcherContent = defineTranslatableContent({
  role: { noun: { word: 'rol', gender: 'm' }, nouns: { en: 'role' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: false,
  },
})

export type RosacResearcherContentSpecs = typeof rosacResearcherContent.specs
export type RosacResearcherField = FieldOf<RosacResearcherContentSpecs>
export type StoredRosacResearcherContent = StoredContent<RosacResearcherContentSpecs>
export type RosacResearcherContentInput = ContentInput<RosacResearcherContentSpecs>

export interface RosacResearcherEditingData {
  content: StoredRosacResearcherContent
  isLegacy: boolean
  version: string
}

export const rosacResearcherSharedSchema = z.object({
  src: z.string().trim().optional(),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  institution: z.string().trim().min(1, 'La institución es obligatoria.'),
  email: z
    .union([
      z
        .string()
        .trim()
        .transform((value) =>
          value === ''
            ? []
            : value
                .split(',')
                .map((address) => address.trim())
                .filter((address) => address !== ''),
        ),
      z.array(z.string().trim()),
    ])
    .pipe(
      z
        .array(z.email({ error: 'Uno o más correos no son válidos.' }))
        .max(2, 'Máximo 2 correos de contacto.'),
    )
    .optional(),
})

export const rosacResearcherCreateSchema = z.strictObject({
  content: rosacResearcherContent.schema,
  src: rosacResearcherSharedSchema.shape.src,
  name: rosacResearcherSharedSchema.shape.name,
  institution: rosacResearcherSharedSchema.shape.institution,
  email: rosacResearcherSharedSchema.shape.email,
})

export const rosacResearcherUpdateSchema = z
  .strictObject({
    version: versionSchema('La versión del perfil es obligatoria y debe ser la que se cargó.'),
    content: rosacResearcherContent.schema.optional(),
    confirmedUnchanged: rosacResearcherContent.confirmationsSchema.optional(),
    src: rosacResearcherSharedSchema.shape.src,
    name: rosacResearcherSharedSchema.shape.name.optional(),
    institution: rosacResearcherSharedSchema.shape.institution.optional(),
    email: rosacResearcherSharedSchema.shape.email,
  })
  .superRefine((input, context) => {
    if (input.confirmedUnchanged && !input.content) {
      context.addIssue({
        code: 'custom',
        path: ['confirmedUnchanged'],
        message: 'Las confirmaciones solo aplican a una actualización de contenido (content).',
      })
    }
    if (
      input.content === undefined &&
      input.src === undefined &&
      input.name === undefined &&
      input.institution === undefined &&
      input.email === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'La solicitud no incluye ningún campo para actualizar.',
      })
    }
  })

export type RosacResearcherCreateInput = z.infer<typeof rosacResearcherCreateSchema>
export type RosacResearcherUpdateInput = z.infer<typeof rosacResearcherUpdateSchema>

export type RosacResearcherCreateBody = z.input<typeof rosacResearcherCreateSchema>
export type RosacResearcherUpdateBody = z.input<typeof rosacResearcherUpdateSchema>
