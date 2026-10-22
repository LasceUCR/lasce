import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  translation: { upsert: vi.fn() },
  transaction: vi.fn(),
}))
vi.mock('@lasce/db', () => ({
  prisma: { $transaction: mocks.transaction, collaboration: mocks.record },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}))
import {
  createCollaboration,
  deleteCollaboration,
  updateCollaboration,
} from './collaboration-writes'
import { collaborationCreateSchema } from './collaboration-schema'
const version = '2026-10-14T12:00:00.000Z'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.transaction.mockImplementation((fn) =>
    fn({ collaboration: mocks.record, collaborationTranslation: mocks.translation }),
  )
  mocks.record.findUnique.mockResolvedValue({
    id: 'partner',
    name: 'Partner',
    country: 'Italia',
    updatedAt: new Date(version),
    translations: [{ locale: 'en', country: 'Italy' }],
  })
  mocks.record.updateMany.mockResolvedValue({ count: 1 })
  mocks.record.aggregate.mockResolvedValue({ _min: { position: 7 } })
  mocks.record.create.mockResolvedValue({ id: 'partner' })
})
describe('collaboration writes', () => {
  test('places a bilingual organization first and stores omitted optional fields as null', async () => {
    const input = collaborationCreateSchema.parse({
      name: 'Partner',
      scope: 'international',
      content: { es: { country: 'Italia' }, en: { country: 'Italy' } },
    })
    expect(await createCollaboration(input)).toEqual({ ok: true, value: { id: 'partner' } })
    expect(mocks.record.create).toHaveBeenCalledWith({
      data: {
        name: 'Partner',
        scope: 'INTERNATIONAL',
        acronym: null,
        websiteUrl: null,
        position: 6,
        country: 'Italia',
        translations: { create: [{ locale: 'en', country: 'Italy' }] },
      },
      select: { id: true },
    })
  })
  test('updates only supplied shared fields and preserves translation rows', async () => {
    expect(
      await updateCollaboration('partner', { version, name: 'Revised', websiteUrl: null }),
    ).toMatchObject({ ok: true })
    expect(mocks.record.updateMany).toHaveBeenCalledWith({
      where: { id: 'partner', updatedAt: new Date(version) },
      data: { name: 'Revised', websiteUrl: null, updatedAt: expect.any(Date) },
    })
    expect(mocks.translation.upsert).not.toHaveBeenCalled()
  })
  test('rejects an outdated version before writing anything', async () => {
    expect(
      await updateCollaboration('partner', { version: '2026-10-13T12:00:00.000Z', name: 'Stale' }),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(mocks.record.updateMany).not.toHaveBeenCalled()
  })
  test('rejects a concurrent update after reading the current version', async () => {
    mocks.record.updateMany.mockResolvedValue({ count: 0 })
    expect(await updateCollaboration('partner', { version, name: 'Stale' })).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(mocks.translation.upsert).not.toHaveBeenCalled()
  })
  test('rejects unreviewed country changes before saving any shared fields', async () => {
    expect(
      await updateCollaboration('partner', {
        version,
        name: 'Revised',
        content: { es: { country: 'República Italiana' }, en: { country: 'Italy' } },
      }),
    ).toEqual({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'country' }],
    })
    expect(mocks.record.updateMany).not.toHaveBeenCalled()
  })
  test('writes both country versions when every language changes', async () => {
    expect(
      await updateCollaboration('partner', {
        version,
        scope: 'national',
        content: { es: { country: 'Alemania' }, en: { country: 'Germany' } },
      }),
    ).toMatchObject({ ok: true })
    expect(mocks.record.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ country: 'Alemania', scope: 'NATIONAL' }),
      }),
    )
    expect(mocks.translation.upsert).toHaveBeenCalledWith({
      where: { collaborationId_locale: { collaborationId: 'partner', locale: 'en' } },
      create: { collaborationId: 'partner', locale: 'en', country: 'Germany' },
      update: { country: 'Germany' },
    })
  })
  test('reports missing records and only reports successful deletion when a row was removed', async () => {
    mocks.record.findUnique.mockResolvedValue(null)
    expect(await updateCollaboration('partner', { version, name: 'Missing' })).toEqual({
      ok: false,
      reason: 'not-found',
    })
    mocks.record.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    expect(await deleteCollaboration('partner')).toBe(true)
    expect(await deleteCollaboration('partner')).toBe(false)
  })
})
