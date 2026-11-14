import type { Prisma } from '@lasce/db'

import { changedFieldNames, recordUserAuditEvent, type AuditActor } from '@/app/lib/audit-log'
import { runAuditedDelete, runWrite, WriteAbort } from '@/app/lib/cms/transaction'
import { isCurrentVersion, nextUpdatedAt, parseVersion } from '@/app/lib/cms/version'
import { baseContent, storedContentFrom, translationRows } from '@/app/lib/i18n/content/resolve'
import { findPendingReviews } from '@/app/lib/i18n/content/review'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import {
  scientificToolContent,
  type ScientificToolCreateInput,
  type ScientificToolField,
  type ScientificToolUpdateInput,
} from './scientific-tool-schema'

export type ScientificToolWriteFailure =
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'review-required'; pending: ReviewConfirmation<ScientificToolField>[] }

/** A new tool is shown after the existing ones (`position` defaults to the next value). */
export async function createScientificTool(input: ScientificToolCreateInput, actor: AuditActor) {
  return runWrite<{ id: string }, ScientificToolWriteFailure>(async (tx) => {
    const created = await tx.scientificTool.create({
      data: {
        name: input.name,
        accessUrl: input.accessUrl,
        imageUrl: input.imageUrl,
        ...baseContent(scientificToolContent, input.content),
        translations: { create: translationRows(scientificToolContent, input.content) },
      },
      select: { id: true },
    })
    await recordUserAuditEvent(tx, actor, {
      action: 'scientific_tool.create',
      summary: `Herramienta científica agregada: ${input.name}`,
      entityType: 'scientific_tool',
      entityId: created.id,
    })
    return created
  })
}

export async function updateScientificTool(
  id: string,
  input: ScientificToolUpdateInput,
  actor: AuditActor,
) {
  return runWrite<{ id: string }, ScientificToolWriteFailure>(async (tx) => {
    const current = await tx.scientificTool.findUnique({
      where: { id },
      include: { translations: true },
    })
    if (!current)
      throw new WriteAbort<ScientificToolWriteFailure>({ ok: false, reason: 'not-found' })
    const expected = parseVersion(input.version)
    if (!isCurrentVersion(current.updatedAt, expected)) {
      throw new WriteAbort<ScientificToolWriteFailure>({ ok: false, reason: 'conflict' })
    }
    const { content } = input
    if (content) {
      const pending = findPendingReviews(
        scientificToolContent,
        storedContentFrom(scientificToolContent, current, current.translations),
        content,
        input.confirmedUnchanged ?? [],
      )
      if (pending.length)
        throw new WriteAbort<ScientificToolWriteFailure>({
          ok: false,
          reason: 'review-required',
          pending,
        })
    }
    const data: Prisma.ScientificToolUpdateManyMutationInput = {
      ...(content ? baseContent(scientificToolContent, content) : {}),
      updatedAt: nextUpdatedAt(expected),
    }
    for (const key of ['name', 'accessUrl', 'imageUrl'] as const) {
      if (input[key] !== undefined) Object.assign(data, { [key]: input[key] })
    }
    // Only while nobody else saved; moves the version strictly forward.
    const { count } = await tx.scientificTool.updateMany({
      where: { id, updatedAt: expected },
      data,
    })
    if (!count) throw new WriteAbort<ScientificToolWriteFailure>({ ok: false, reason: 'conflict' })
    if (content) {
      for (const { locale, ...text } of translationRows(scientificToolContent, content)) {
        await tx.scientificToolTranslation.upsert({
          where: { scientificToolId_locale: { scientificToolId: id, locale } },
          create: { scientificToolId: id, locale, ...text },
          update: text,
        })
      }
    }
    await recordUserAuditEvent(tx, actor, {
      action: 'scientific_tool.update',
      summary: `Herramienta científica actualizada: ${input.name ?? current.name}`,
      entityType: 'scientific_tool',
      entityId: id,
      metadata: { fields: changedFieldNames(input) },
    })
    return { id }
  })
}

/** Deletes the tool and, by cascade, its translations. `false` when it no longer exists. */
export async function deleteScientificTool(id: string, actor: AuditActor) {
  return runAuditedDelete(
    (tx) => tx.scientificTool.findUnique({ where: { id }, select: { name: true } }),
    (tx) => tx.scientificTool.deleteMany({ where: { id } }),
    (tx, tool) =>
      recordUserAuditEvent(tx, actor, {
        action: 'scientific_tool.delete',
        summary: `Herramienta científica eliminada: ${tool.name}`,
        entityType: 'scientific_tool',
        entityId: id,
      }),
  )
}
