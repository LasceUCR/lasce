import { randomUUID } from 'node:crypto'
import { prisma } from '@lasce/db'
import { afterAll, describe, expect, test } from 'vitest'
import { getCollaborationRecords } from '@/app/lib/collaboration-records'
import {
  collaborationCreateSchema,
  collaborationUpdateSchema,
} from '@/app/lib/collaboration-schema'
import {
  createCollaboration,
  deleteCollaboration,
  updateCollaboration,
} from '@/app/lib/collaboration-writes'

const ids: string[] = []
async function create() {
  const result = await createCollaboration(
    collaborationCreateSchema.parse({
      name: `CMS ${randomUUID()}`,
      scope: 'international',
      content: { es: { country: 'Italia' }, en: { country: 'Italy' } },
    }),
  )
  if (!result.ok) throw new Error(result.reason)
  ids.push(result.value.id)
  const record = (await getCollaborationRecords('es', { includeEditingData: true })).find(
    ({ id }) => id === result.value.id,
  )!
  return record
}
afterAll(async () => {
  await prisma.collaboration.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('collaboration CMS persistence', () => {
  test('creates bilingual records, preserves classification and does not expose editor metadata publicly', async () => {
    const record = await create()
    expect(record).toMatchObject({
      country: 'Italia',
      scope: 'international',
      editing: { isLegacy: false },
    })
    const english = (await getCollaborationRecords('en')).find(({ id }) => id === record.id)!
    expect(english).toMatchObject({ name: record.name, country: 'Italy', scope: 'international' })
    expect(english).not.toHaveProperty('editing')
  })
  test('persists and clears optional fields without changing translations', async () => {
    const record = await create()
    expect(
      await updateCollaboration(
        record.id,
        collaborationUpdateSchema.parse({
          version: record.editing!.version,
          acronym: 'CMS',
          websiteUrl: 'https://example.com',
          scope: 'national',
        }),
      ),
    ).toMatchObject({ ok: true })
    const changed = (await getCollaborationRecords('en', { includeEditingData: true })).find(
      ({ id }) => id === record.id,
    )!
    expect(changed).toMatchObject({
      acronym: 'CMS',
      scope: 'national',
      websiteUrl: 'https://example.com',
      country: 'Italy',
    })
    expect(
      await updateCollaboration(
        record.id,
        collaborationUpdateSchema.parse({
          version: changed.editing!.version,
          acronym: '',
          websiteUrl: '',
        }),
      ),
    ).toMatchObject({ ok: true })
    expect(await prisma.collaboration.findUnique({ where: { id: record.id } })).toMatchObject({
      acronym: null,
      websiteUrl: null,
      country: 'Italia',
    })
  })
  test('rejects missing reviews without changing any stored fields and accepts an explicit review', async () => {
    const record = await create()
    const update = {
      version: record.editing!.version,
      name: 'Changed name',
      content: { es: { country: 'República Italiana' }, en: { country: 'Italy' } },
    }
    expect(
      await updateCollaboration(record.id, collaborationUpdateSchema.parse(update)),
    ).toMatchObject({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'country' }],
    })
    expect(await prisma.collaboration.findUnique({ where: { id: record.id } })).toMatchObject({
      name: record.name,
      country: 'Italia',
    })
    expect(
      await updateCollaboration(
        record.id,
        collaborationUpdateSchema.parse({
          ...update,
          confirmedUnchanged: [{ locale: 'en', field: 'country' }],
        }),
      ),
    ).toMatchObject({ ok: true })
  })
  test('allows only one concurrent save against the same version and rejects stale retries', async () => {
    const record = await create()
    const results = await Promise.all(
      ['A', 'B'].map((name) =>
        updateCollaboration(record.id, { version: record.editing!.version, name }),
      ),
    )
    expect(results.filter(({ ok }) => ok)).toHaveLength(1)
    expect(results.filter(({ ok }) => !ok)).toEqual([{ ok: false, reason: 'conflict' }])
    expect(
      await updateCollaboration(record.id, { version: record.editing!.version, name: 'Stale' }),
    ).toEqual({ ok: false, reason: 'conflict' })
  })
  test('rolls back base edits when the database rejects the translation write', async () => {
    const record = await create()
    // A test-only trigger scoped to this row. The integration guard requires a disposable database.
    const suffix = record.id.replaceAll('-', '')
    const trigger = `cms_failure_${suffix}`
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION research.${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.collaboration_id = '${record.id}'::uuid THEN RAISE EXCEPTION 'simulated translation failure'; END IF; RETURN NEW; END $$`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER ${trigger} BEFORE UPDATE ON research.collaboration_translations FOR EACH ROW EXECUTE FUNCTION research.${trigger}()`,
    )
    try {
      await expect(
        updateCollaboration(record.id, {
          version: record.editing!.version,
          name: 'Must roll back',
          content: { es: { country: 'Alemania' }, en: { country: 'Germany' } },
        }),
      ).rejects.toThrow()
      expect(
        await prisma.collaboration.findUnique({
          where: { id: record.id },
          include: { translations: true },
        }),
      ).toMatchObject({
        name: record.name,
        country: 'Italia',
        updatedAt: new Date(record.editing!.version),
        translations: [expect.objectContaining({ country: 'Italy' })],
      })
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER ${trigger} ON research.collaboration_translations`,
      )
      await prisma.$executeRawUnsafe(`DROP FUNCTION research.${trigger}()`)
    }
  })
  test('deletes the record and its translations and reports an already deleted record', async () => {
    const record = await create()
    expect(await deleteCollaboration(record.id)).toBe(true)
    expect(
      await prisma.collaborationTranslation.count({ where: { collaborationId: record.id } }),
    ).toBe(0)
    expect(await deleteCollaboration(record.id)).toBe(false)
    expect(
      await updateCollaboration(record.id, { version: record.editing!.version, name: 'Deleted' }),
    ).toEqual({ ok: false, reason: 'not-found' })
  })
})
