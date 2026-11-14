import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  translation: { upsert: vi.fn() },
  audit: { create: vi.fn() },
  transaction: vi.fn(),
}))
vi.mock('@lasce/db', () => ({
  prisma: { $transaction: mocks.transaction, scientificTool: mocks.record },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}))
import { scientificToolCreateSchema } from './scientific-tool-schema'
import {
  createScientificTool,
  deleteScientificTool,
  updateScientificTool,
} from './scientific-tool-writes'

const actor = { id: 'editor' }
const version = '2026-11-13T12:00:00.000Z'
const content = {
  es: { description: 'Análisis de eventos solares.' },
  en: { description: 'Analysis of solar events.' },
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.transaction.mockImplementation((fn) =>
    fn({
      scientificTool: mocks.record,
      scientificToolTranslation: mocks.translation,
      auditEvent: mocks.audit,
    }),
  )
  mocks.record.findUnique.mockResolvedValue({
    id: 'swaat',
    name: 'SWAAT',
    description: content.es.description,
    updatedAt: new Date(version),
    translations: [{ locale: 'en', description: content.en.description }],
  })
  mocks.record.updateMany.mockResolvedValue({ count: 1 })
  mocks.record.create.mockResolvedValue({ id: 'swaat' })
})

function auditAction() {
  return mocks.audit.create.mock.calls.map(([{ data }]) => data.action)
}

describe('scientific tool writes', () => {
  test('creates a tool with its Spanish text, English translation and an audit event', async () => {
    const input = scientificToolCreateSchema.parse({
      name: 'SWAAT',
      accessUrl: 'https://swaat.example.com/',
      content,
    })
    expect(await createScientificTool(input, actor)).toEqual({ ok: true, value: { id: 'swaat' } })
    expect(mocks.record.create).toHaveBeenCalledWith({
      data: {
        name: 'SWAAT',
        accessUrl: 'https://swaat.example.com/',
        imageUrl: null,
        description: content.es.description,
        translations: { create: [{ locale: 'en', description: content.en.description }] },
      },
      select: { id: true },
    })
    expect(mocks.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'scientific_tool.create',
        summary: 'Herramienta científica agregada: SWAAT',
        actorId: 'editor',
        entityId: 'swaat',
      }),
    })
  })

  test('updates only the shared fields supplied and leaves translations alone', async () => {
    expect(
      await updateScientificTool(
        'swaat',
        { version, accessUrl: 'https://new.example.com/', imageUrl: null },
        actor,
      ),
    ).toEqual({ ok: true, value: { id: 'swaat' } })
    expect(mocks.record.updateMany).toHaveBeenCalledWith({
      where: { id: 'swaat', updatedAt: new Date(version) },
      data: { accessUrl: 'https://new.example.com/', imageUrl: null, updatedAt: expect.any(Date) },
    })
    expect(mocks.translation.upsert).not.toHaveBeenCalled()
    expect(mocks.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'scientific_tool.update',
        summary: 'Herramienta científica actualizada: SWAAT',
        metadata: { fields: ['accessUrl', 'imageUrl'] },
      }),
    })
  })

  test('writes the description in every language when both change', async () => {
    const next = { es: { description: 'Nueva.' }, en: { description: 'New.' } }
    expect(
      await updateScientificTool('swaat', { version, name: 'SWAAT 2', content: next }, actor),
    ).toMatchObject({ ok: true })
    expect(mocks.record.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'SWAAT 2', description: 'Nueva.' }),
      }),
    )
    expect(mocks.translation.upsert).toHaveBeenCalledWith({
      where: { scientificToolId_locale: { scientificToolId: 'swaat', locale: 'en' } },
      create: { scientificToolId: 'swaat', locale: 'en', description: 'New.' },
      update: { description: 'New.' },
    })
  })

  test('asks to review a description changed in one language only', async () => {
    const next = { ...content, es: { description: 'Nueva.' } }
    expect(await updateScientificTool('swaat', { version, content: next }, actor)).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'description' }],
    })
    expect(mocks.record.updateMany).not.toHaveBeenCalled()
    expect(
      await updateScientificTool(
        'swaat',
        { version, content: next, confirmedUnchanged: [{ locale: 'en', field: 'description' }] },
        actor,
      ),
    ).toMatchObject({ ok: true })
  })

  test('rejects stale and concurrent saves without recording anything', async () => {
    expect(
      await updateScientificTool(
        'swaat',
        { version: '2026-11-12T12:00:00.000Z', name: 'Other' },
        actor,
      ),
    ).toEqual({ ok: false, reason: 'conflict' })
    mocks.record.updateMany.mockResolvedValue({ count: 0 })
    expect(await updateScientificTool('swaat', { version, name: 'Other' }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(mocks.audit.create).not.toHaveBeenCalled()
  })

  test('reports a tool that no longer exists', async () => {
    mocks.record.findUnique.mockResolvedValue(null)
    expect(await updateScientificTool('swaat', { version, name: 'Other' }, actor)).toEqual({
      ok: false,
      reason: 'not-found',
    })
    expect(await deleteScientificTool('swaat', actor)).toBe(false)
    expect(mocks.record.deleteMany).not.toHaveBeenCalled()
  })

  test('deletes a tool and records its name', async () => {
    mocks.record.deleteMany.mockResolvedValue({ count: 1 })
    expect(await deleteScientificTool('swaat', actor)).toBe(true)
    expect(mocks.record.deleteMany).toHaveBeenCalledWith({ where: { id: 'swaat' } })
    expect(auditAction()).toEqual(['scientific_tool.delete'])
    expect(mocks.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: 'Herramienta científica eliminada: SWAAT' }),
    })
  })
})
