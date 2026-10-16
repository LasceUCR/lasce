import { prisma, type Prisma } from '@lasce/db'

import { runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion } from '@/app/lib/cms/version'
import { baseContent, storedContentFrom, translationRows } from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import { collaborationContent } from './research-collaborations'
import type { CollaborationCreateInput, CollaborationUpdateInput } from './collaboration-schema'

export type CollaborationWriteFailure =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation<'country'>[] }

const scopes = { national: 'NATIONAL', international: 'INTERNATIONAL' } as const

export async function createCollaboration(input: CollaborationCreateInput) {
  return runWrite<{ id: string }, CollaborationWriteFailure>(async (tx) => {
    const last = await tx.collaboration.aggregate({ _max: { position: true } })
    return tx.collaboration.create({
      data: {
        name: input.name,
        acronym: input.acronym,
        scope: scopes[input.scope],
        websiteUrl: input.websiteUrl,
        position: (last._max.position ?? -1) + 1,
        ...baseContent(collaborationContent, input.content),
        translations: { create: translationRows(collaborationContent, input.content) },
      },
      select: { id: true },
    })
  })
}

export async function updateCollaboration(id: string, input: CollaborationUpdateInput) {
  return runWrite<{ id: string }, CollaborationWriteFailure>(async (tx) => {
    const current = await tx.collaboration.findUnique({
      where: { id },
      include: { translations: true },
    })
    if (!current)
      throw new WriteAbort<CollaborationWriteFailure>({ ok: false, reason: 'not-found' })
    const expected = parseVersion(input.version)
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<CollaborationWriteFailure>({ ok: false, reason: 'conflict' })
    }
    const { content } = input
    if (content) {
      const pending = findPendingReviews(
        collaborationContent,
        storedContentFrom(collaborationContent, current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length)
        throw new WriteAbort<CollaborationWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
    }
    const data: Prisma.CollaborationUpdateManyMutationInput = {
      ...(content ? baseContent(collaborationContent, content) : {}),
      updatedAt: nextUpdatedAt(expected),
    }
    for (const key of ['name', 'acronym', 'websiteUrl'] as const) {
      if (input[key] !== undefined) Object.assign(data, { [key]: input[key] })
    }
    if (input.scope !== undefined) data.scope = scopes[input.scope]
    const { count } = await tx.collaboration.updateMany({
      where: { id, updatedAt: expected },
      data,
    })
    if (!count) throw new WriteAbort<CollaborationWriteFailure>({ ok: false, reason: 'conflict' })
    if (content) {
      for (const { locale, ...text } of translationRows(collaborationContent, content)) {
        await tx.collaborationTranslation.upsert({
          where: { collaborationId_locale: { collaborationId: id, locale } },
          create: { collaborationId: id, locale, ...text },
          update: text,
        })
      }
    }
    return { id }
  })
}

export async function deleteCollaboration(id: string) {
  const { count } = await prisma.collaboration.deleteMany({ where: { id } })
  return count > 0
}
