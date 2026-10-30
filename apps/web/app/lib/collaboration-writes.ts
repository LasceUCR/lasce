import type { Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runAuditedDelete, runWrite, WriteAbort } from '@/app/lib/cms/transaction'
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

export async function createCollaboration(input: CollaborationCreateInput, actor: AuditActor) {
  return runWrite<{ id: string }, CollaborationWriteFailure>(async (tx) => {
    const first = await tx.collaboration.aggregate({ _min: { position: true } })
    const earliest = first._min.position
    const created = await tx.collaboration.create({
      data: {
        name: input.name,
        acronym: input.acronym,
        scope: scopes[input.scope],
        websiteUrl: input.websiteUrl,
        position: earliest === null || earliest === undefined ? 0 : earliest - 1,
        ...baseContent(collaborationContent, input.content),
        translations: { create: translationRows(collaborationContent, input.content) },
      },
      select: { id: true },
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'collaboration.create',
      summary: `Colaboración agregada: ${input.name}`,
      entityType: 'collaboration',
      entityId: created.id,
    })
    return created
  })
}

export async function updateCollaboration(
  id: string,
  input: CollaborationUpdateInput,
  actor: AuditActor,
) {
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
    await recordUserAuditEvent(tx, actor, {
      action: 'collaboration.update',
      summary: `Colaboración actualizada: ${input.name ?? current.name}`,
      entityType: 'collaboration',
      entityId: id,
      metadata: { fields: changedFieldNames(input) },
    })
    return { id }
  })
}

export async function deleteCollaboration(id: string, actor: AuditActor) {
  return runAuditedDelete(
    (tx) => tx.collaboration.findUnique({ where: { id }, select: { name: true } }),
    (tx) => tx.collaboration.deleteMany({ where: { id } }),
    (tx, collaboration) =>
      recordUserAuditEvent(tx, actor, {
        action: 'collaboration.delete',
        summary: `Colaboración eliminada: ${collaboration.name}`,
        entityType: 'collaboration',
        entityId: id,
      }),
  )
}
