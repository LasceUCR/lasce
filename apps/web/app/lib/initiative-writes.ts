import { prisma, type Prisma } from '@lasce/db'

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion } from '@/app/lib/cms/version'
import { baseContent, storedContentFrom, translationRows } from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import { initiativeContent } from './initiative-schema'
import type { InitiativeCreateInput, InitiativeUpdateInput } from './initiative-schema'

export type InitiativeWriteFailure =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation<'title' | 'description'>[] }

export async function createInitiative(input: InitiativeCreateInput) {
  return runWrite<{ id: string }, InitiativeWriteFailure>(async (tx) => {
    return tx.initiative.create({
      data: {
        logoUrl: input.logoUrl,
        websiteUrl: input.websiteUrl,
        ...baseContent(initiativeContent, input.content),
        translations: { create: translationRows(initiativeContent, input.content) },
      },
      select: { id: true },
    })
  })
}

export async function updateInitiative(id: string, input: InitiativeUpdateInput) {
  return runWrite<{ id: string }, InitiativeWriteFailure>(async (tx) => {
    const current = await tx.initiative.findUnique({
      where: { id },
      include: { translations: true },
    })
    if (!current) throw new WriteAbort<InitiativeWriteFailure>({ ok: false, reason: 'not-found' })
    const expected = parseVersion(input.version)
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<InitiativeWriteFailure>({ ok: false, reason: 'conflict' })
    }
    const { content } = input
    if (content) {
      const pending = findPendingReviews(
        initiativeContent,
        storedContentFrom(initiativeContent, current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length)
        throw new WriteAbort<InitiativeWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
    }
    const data: Prisma.InitiativeUpdateManyMutationInput = {
      ...(content ? baseContent(initiativeContent, content) : {}),
      updatedAt: nextUpdatedAt(expected),
    }
    for (const key of ['logoUrl', 'websiteUrl'] as const) {
      if (input[key] !== undefined) Object.assign(data, { [key]: input[key] })
    }
    const { count } = await tx.initiative.updateMany({
      where: { id, updatedAt: expected },
      data,
    })
    if (!count) throw new WriteAbort<InitiativeWriteFailure>({ ok: false, reason: 'conflict' })
    if (content) {
      for (const { locale, ...text } of translationRows(initiativeContent, content)) {
        await tx.initiativeTranslation.upsert({
          where: { initiativeId_locale: { initiativeId: id, locale } },
          create: { initiativeId: id, locale, ...text },
          update: text,
        })
      }
    }
    return { id }
  })
}

export async function deleteInitiative(id: string) {
  const { count } = await prisma.initiative.deleteMany({ where: { id } })
  return count > 0
}
