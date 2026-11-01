import {
  defineTranslatableContent,
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

export const rosacCharacteristicContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacCharacteristicContent = StoredContent<
  typeof rosacCharacteristicContent.specs
>

export type RosacCharacteristicField = FieldOf<typeof rosacCharacteristicContent.specs>

export const rosacActivityContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacActivityContent = StoredContent<typeof rosacActivityContent.specs>

export type RosacActivityField = FieldOf<typeof rosacActivityContent.specs>

export const rosacStageContent = defineTranslatableContent({
  title: { noun: { word: 'título', gender: 'm' }, nouns: { en: 'title' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacStageContent = StoredContent<typeof rosacStageContent.specs>

export type RosacStageField = FieldOf<typeof rosacStageContent.specs>

export const rosacInstrumentContent = defineTranslatableContent({
  name: { noun: { word: 'nombre', gender: 'm' }, nouns: { en: 'name' }, required: true },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
  },
})

export type StoredRosacInstrumentContent = StoredContent<typeof rosacInstrumentContent.specs>

export type RosacInstrumentField = FieldOf<typeof rosacInstrumentContent.specs>
