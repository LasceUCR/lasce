import { prisma, type ContactChannelIcon as DbContactChannelIcon, type Prisma } from '@lasce/db'

import { WriteAbort, runWrite } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion, toVersion } from '@/app/lib/cms/version'
import type { Locale } from '@/app/lib/i18n/config'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import {
  baseContent,
  contentLangAttribute,
  isLegacyContent,
  resolveContent,
  storedContentFrom,
  translationRows,
} from '@/app/lib/i18n/content/resolve'

import {
  contactChannelContent,
  storedHref,
  type ContactCard,
  type ContactChannelCreateInput,
  type ContactChannelIcon,
  type ContactChannelUpdateInput,
} from './contact-channel-schema'

const ICON_TO_DB: Record<ContactChannelIcon, DbContactChannelIcon> = {
  phone: 'PHONE',
  instagram: 'INSTAGRAM',
  location: 'LOCATION',
  email: 'EMAIL',
  facebook: 'FACEBOOK',
}

const ICON_FROM_DB: Record<DbContactChannelIcon, ContactChannelIcon> = {
  PHONE: 'phone',
  INSTAGRAM: 'instagram',
  LOCATION: 'location',
  EMAIL: 'email',
  FACEBOOK: 'facebook',
}

const recordInclude = {
  translations: { select: { locale: true, title: true, description: true } },
} satisfies Prisma.ContactChannelInclude

type ChannelRow = Prisma.ContactChannelGetPayload<{ include: typeof recordInclude }>

function toCard(row: ChannelRow, locale: Locale, includeEditing: boolean): ContactCard {
  const stored = storedContentFrom(contactChannelContent, row, row.translations)
  const resolved = resolveContent(stored, locale)

  return {
    id: row.id,
    icon: ICON_FROM_DB[row.icon],
    title: resolved.content.title,
    description: resolved.content.description,
    href: row.href,
    lang: contentLangAttribute(resolved.contentLocale),
    editing: includeEditing
      ? { content: stored, isLegacy: isLegacyContent(stored), version: toVersion(row.updatedAt) }
      : null,
  }
}

/** The contact cards in display order, in `locale`, falling back to Spanish per card. */
export async function getContactChannels(
  locale: Locale,
  includeEditing = false,
): Promise<ContactCard[]> {
  const rows = await prisma.contactChannel.findMany({
    orderBy: { position: 'asc' },
    include: recordInclude,
  })

  return rows.map((row) => toCard(row, locale, includeEditing))
}

export type ContactChannelWriteFailure =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: { locale: Locale; field: string }[] }

export async function createContactChannel(input: ContactChannelCreateInput): Promise<ContactCard> {
  const last = await prisma.contactChannel.aggregate({ _max: { position: true } })
  const position = (last._max.position ?? -1) + 1
  const created = await prisma.contactChannel.create({
    data: {
      icon: ICON_TO_DB[input.icon],
      href: storedHref(input.icon, input.href),
      position,
      ...baseContent(contactChannelContent, input.content),
      translations: { create: translationRows(contactChannelContent, input.content) },
    },
    include: recordInclude,
  })

  return toCard(created, 'es', true)
}

export async function updateContactChannel(
  id: string,
  input: ContactChannelUpdateInput,
): Promise<{ ok: true; card: ContactCard } | ContactChannelWriteFailure> {
  const expected = parseVersion(input.version)

  const result = await runWrite<ContactCard, ContactChannelWriteFailure>(async (tx) => {
    const current = await tx.contactChannel.findUnique({
      where: { id },
      include: recordInclude,
    })

    if (!current) {
      throw new WriteAbort<ContactChannelWriteFailure>({ ok: false, reason: 'not-found' })
    }

    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<ContactChannelWriteFailure>({ ok: false, reason: 'conflict' })
    }

    const pending = findPendingReviews(
      contactChannelContent,
      storedContentFrom(contactChannelContent, current, current.translations),
      input.content,
      input.confirmedUnchanged ?? [],
    )

    if (pending.length > 0) {
      throw new WriteAbort<ContactChannelWriteFailure>({
        ok: false,
        reason: 'review-required',
        pending,
      })
    }

    const { count } = await tx.contactChannel.updateMany({
      where: { id, updatedAt: expected },
      data: {
        icon: ICON_TO_DB[input.icon],
        href: storedHref(input.icon, input.href),
        ...baseContent(contactChannelContent, input.content),
        updatedAt: nextUpdatedAt(expected),
      },
    })

    if (count === 0) {
      throw new WriteAbort<ContactChannelWriteFailure>({ ok: false, reason: 'conflict' })
    }

    for (const { locale, ...text } of translationRows(contactChannelContent, input.content)) {
      await tx.contactChannelTranslation.upsert({
        where: { contactChannelId_locale: { contactChannelId: id, locale } },
        create: { contactChannelId: id, locale, ...text },
        update: text,
      })
    }

    const saved = await tx.contactChannel.findUniqueOrThrow({
      where: { id },
      include: recordInclude,
    })

    return toCard(saved, 'es', true)
  })

  return result.ok ? { ok: true, card: result.value } : result
}

export async function deleteContactChannel(id: string): Promise<boolean> {
  const { count } = await prisma.contactChannel.deleteMany({ where: { id } })
  return count > 0
}
