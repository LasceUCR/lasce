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

export const CONTACT_CHANNEL_ICONS = [
  'phone',
  'instagram',
  'location',
  'email',
  'facebook',
] as const

export type ContactChannelIcon = (typeof CONTACT_CHANNEL_ICONS)[number]

/** Icons that may carry a clickable https link. The other icons do not. */
export const SOCIAL_CHANNEL_ICONS = ['instagram', 'facebook'] as const

export function isSocialChannelIcon(icon: ContactChannelIcon): boolean {
  return (SOCIAL_CHANNEL_ICONS as readonly string[]).includes(icon)
}

/**
 * Title and description, required in every language. Spanish lives on `contact_channels`;
 * English lives in `contact_channel_translations`.
 */
/** Long enough for an email or a short address, short enough that a card stays a few lines. */
export const CONTACT_CHANNEL_DESCRIPTION_MAX = 120

export const contactChannelContent = defineTranslatableContent({
  title: {
    noun: { word: 'título', gender: 'm' },
    nouns: { en: 'title' },
    required: true,
    maxLength: 80,
  },
  description: {
    noun: { word: 'descripción', gender: 'f' },
    nouns: { en: 'description' },
    required: true,
    maxLength: CONTACT_CHANNEL_DESCRIPTION_MAX,
  },
})

type ChannelSpecs = typeof contactChannelContent.specs

export type ContactChannelField = FieldOf<ChannelSpecs>

export type StoredContactChannelContent = StoredContent<ChannelSpecs>

export type ContactChannelContentInput = ContentInput<ChannelSpecs>

export type ContactChannelReview = ContentReviewConfirmation<ContactChannelField>

const httpsUrl = z
  .string()
  .trim()
  .max(500, 'El enlace no puede pasar de 500 caracteres.')
  .refine((value) => /^https:\/\/\S+$/i.test(value), 'El enlace debe empezar por https://.')

/** Absent, blank or whitespace become `null`. A social icon may keep an https URL. */
const hrefField = z
  .union([z.null(), z.string()])
  .optional()
  .transform((value) => value?.trim() || null)

export const contactChannelCreateSchema = z
  .strictObject({
    icon: z.enum(CONTACT_CHANNEL_ICONS, { error: 'Elija un ícono.' }),
    href: hrefField,
    content: contactChannelContent.schema,
  })
  .superRefine((value, context) => {
    refineHref(value.icon, value.href, context)
    refinePhone(value.icon, value.content, context)
  })

export const contactChannelUpdateSchema = z
  .strictObject({
    icon: z.enum(CONTACT_CHANNEL_ICONS, { error: 'Elija un ícono.' }),
    href: hrefField,
    content: contactChannelContent.schema,
    version: versionSchema('La versión del canal no es válida.'),
    confirmedUnchanged: contactChannelContent.confirmationsSchema.optional(),
  })
  .superRefine((value, context) => {
    refineHref(value.icon, value.href, context)
    refinePhone(value.icon, value.content, context)
  })

export type ContactChannelCreateInput = z.infer<typeof contactChannelCreateSchema>

export type ContactChannelUpdateInput = z.infer<typeof contactChannelUpdateSchema>

/**
 * One telephone number: eight local digits, or those eight with the 506 country code.
 * Spaces, hyphens, dots and parentheses may group that number. A second number, or any
 * other text, does not match.
 */
export function isSinglePhoneNumber(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '' || /[^\d\s.()+-]/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 8 || (digits.length === 11 && digits.startsWith('506'))
}

const phoneNumberMessage = 'Escriba un solo número de teléfono.'

function refinePhone(
  icon: ContactChannelIcon,
  content: ContactChannelContentInput,
  context: z.RefinementCtx,
): void {
  if (icon !== 'phone') return

  for (const locale of ['es', 'en'] as const) {
    if (!isSinglePhoneNumber(content[locale].description)) {
      context.addIssue({
        code: 'custom',
        path: ['content', locale, 'description'],
        message: phoneNumberMessage,
      })
    }
  }
}

function refineHref(icon: ContactChannelIcon, href: string | null, context: z.RefinementCtx): void {
  if (!isSocialChannelIcon(icon)) return
  if (href === null) return
  const parsed = httpsUrl.safeParse(href)
  if (!parsed.success) {
    context.addIssue({
      code: 'custom',
      path: ['href'],
      message: parsed.error.issues[0]?.message ?? 'El enlace no es válido.',
    })
  }
}

/** A non-social icon never stores a link, even if the client sent one. */
export function storedHref(icon: ContactChannelIcon, href: string | null): string | null {
  return isSocialChannelIcon(icon) ? href : null
}

/**
 * Where the description links, when it links at all.
 * Instagram and Facebook use the stored https URL. A phone description of digits
 * becomes a Costa Rica `tel:` link. An email description becomes `mailto:`.
 */
export function contactCardLink(
  icon: ContactChannelIcon,
  description: string,
  href: string | null,
): { href: string; external: boolean } | null {
  if (isSocialChannelIcon(icon) && href) return { href, external: true }

  if (icon === 'phone' && isSinglePhoneNumber(description)) {
    const digits = description.replace(/\D/g, '')
    const local = digits.length === 11 && digits.startsWith('506') ? digits.slice(3) : digits
    return { href: `tel:+506${local}`, external: false }
  }

  if (icon === 'email' && description.includes('@')) {
    return { href: `mailto:${description.trim()}`, external: false }
  }

  return null
}

export interface ContactChannelEditing {
  content: StoredContactChannelContent
  isLegacy: boolean
  version: string
}

/** One card as the page renders it. `editing` is present only for an editor. */
export interface ContactCard {
  id: string
  icon: ContactChannelIcon
  title: string
  description: string
  href: string | null
  /** Language the title and description are actually in. */
  lang: string | undefined
  editing: ContactChannelEditing | null
}

const placeholderValue =
  /^(n\/?a|pendiente|pr[oó]ximamente|por definir|contenido en preparaci[oó]n|ejemplo|placeholder|xxx+|-+)$/i

export function isVisibleContactCard(card: Pick<ContactCard, 'title' | 'description'>): boolean {
  const lines = [card.title, card.description].map((line) => line.trim())
  return lines.every((line) => line.length > 0 && !placeholderValue.test(line))
}

/** Blank draft text for one locale, used by the editor. */
export function emptyChannelText(): LocalizedContent<ChannelSpecs> {
  return { title: '', description: '' }
}

export type { Locale }
