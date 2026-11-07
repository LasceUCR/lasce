import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  translation: { upsert: vi.fn() },
  transaction: vi.fn(),
}))
vi.mock('@lasce/db', () => ({
  prisma: { $transaction: mocks.transaction, initiative: mocks.record },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}))
import { createInitiative, deleteInitiative, updateInitiative } from './initiative-writes'
import { initiativeCreateSchema } from './initiative-schema'
const version = '2026-10-14T12:00:00.000Z'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.transaction.mockImplementation((fn) =>
    fn({ initiative: mocks.record, initiativeTranslation: mocks.translation }),
  )
  mocks.record.findUnique.mockResolvedValue({
    id: 'partner',
    name: 'Partner',
    title: 'Italia',
    description: 'Descripción',
    updatedAt: new Date(version),
    translations: [{ locale: 'en', title: 'Italy', description: 'Description' }],
  })
  mocks.record.updateMany.mockResolvedValue({ count: 1 })
  mocks.record.create.mockResolvedValue({ id: 'partner' })
})
describe('initiative writes', () => {
  test('creates a bilingual initiative and stores omitted optional fields as null', async () => {
    const input = initiativeCreateSchema.parse({
      content: {
        es: { title: 'Italia', description: 'Descripción' },
        en: { title: 'Italy', description: 'Description' },
      },
    })
    expect(await createInitiative(input)).toEqual({ ok: true, value: { id: 'partner' } })
    expect(mocks.record.create).toHaveBeenCalledWith({
      data: {
        logoUrl: null,
        websiteUrl: null,
        title: 'Italia',
        description: 'Descripción',
        translations: { create: [{ locale: 'en', title: 'Italy', description: 'Description' }] },
      },
      select: { id: true },
    })
  })
  test('updates only supplied shared fields and preserves translation rows', async () => {
    expect(
      await updateInitiative('partner', {
        version,
        logoUrl: 'https://example.com/logo.png',
        websiteUrl: null,
      }),
    ).toMatchObject({ ok: true })
    expect(mocks.record.updateMany).toHaveBeenCalledWith({
      where: { id: 'partner', updatedAt: new Date(version) },
      data: {
        logoUrl: 'https://example.com/logo.png',
        websiteUrl: null,
        updatedAt: expect.any(Date),
      },
    })
    expect(mocks.translation.upsert).not.toHaveBeenCalled()
  })
  test('rejects an outdated version before writing anything', async () => {
    expect(
      await updateInitiative('partner', { version: '2026-10-13T12:00:00.000Z', logoUrl: null }),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(mocks.record.updateMany).not.toHaveBeenCalled()
  })
  test('rejects a concurrent update after reading the current version', async () => {
    mocks.record.updateMany.mockResolvedValue({ count: 0 })
    expect(await updateInitiative('partner', { version, logoUrl: null })).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(mocks.translation.upsert).not.toHaveBeenCalled()
  })
  test('rejects unreviewed title changes before saving any shared fields', async () => {
    expect(
      await updateInitiative('partner', {
        version,
        logoUrl: 'https://example.com/logo.png',
        content: {
          es: { title: 'República Italiana', description: 'Descripción' },
          en: { title: 'Italy', description: 'Description' },
        },
      }),
    ).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    expect(mocks.record.updateMany).not.toHaveBeenCalled()
  })
  test('writes both title versions when every language changes', async () => {
    expect(
      await updateInitiative('partner', {
        version,
        content: {
          es: { title: 'Alemania', description: 'Nueva descripción' },
          en: { title: 'Germany', description: 'New description' },
        },
      }),
    ).toMatchObject({ ok: true })
    expect(mocks.record.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Alemania', description: 'Nueva descripción' }),
      }),
    )
    expect(mocks.translation.upsert).toHaveBeenCalledWith({
      where: { initiativeId_locale: { initiativeId: 'partner', locale: 'en' } },
      create: {
        initiativeId: 'partner',
        locale: 'en',
        title: 'Germany',
        description: 'New description',
      },
      update: { title: 'Germany', description: 'New description' },
    })
  })
  test('reports missing records and only reports successful deletion when a row was removed', async () => {
    mocks.record.findUnique.mockResolvedValue(null)
    expect(await updateInitiative('partner', { version, logoUrl: null })).toEqual({
      ok: false,
      reason: 'not-found',
    })
    mocks.record.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    expect(await deleteInitiative('partner')).toBe(true)
    expect(await deleteInitiative('partner')).toBe(false)
  })
})
