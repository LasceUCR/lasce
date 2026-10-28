import { randomUUID } from 'node:crypto'
import { prisma } from '@lasce/db'
import { afterAll, describe, expect, test } from 'vitest'
import { getCollaborationsContent } from '@/app/lib/collaborations'
import { getMessages } from '@/app/lib/i18n/messages'
import { getInitiativeRecords } from '@/app/lib/initiative-records'
import { initiativeCreateSchema, initiativeUpdateSchema } from '@/app/lib/initiative-schema'
import { createInitiative, deleteInitiative, updateInitiative } from '@/app/lib/initiative-writes'

const ids: string[] = []
const content = {
  es: { title: 'Iniciativa de integración', description: 'Primer párrafo.\n\nSegundo párrafo.' },
  en: { title: 'Integration initiative', description: 'First paragraph.\n\nSecond paragraph.' },
}
async function create() {
  const result = await createInitiative(
    initiativeCreateSchema.parse({
      content,
      websiteUrl: 'https://example.com',
      logoUrl: '/brand/logo-ISWI.png',
    }),
  )
  if (!result.ok) throw new Error(result.reason)
  ids.push(result.value.id)
  return (await getInitiativeRecords('es', { includeEditingData: true })).find(
    ({ id }) => id === result.value.id,
  )!
}
afterAll(async () => {
  await prisma.initiative.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('initiative persistence', () => {
  test('rolls back creation when the English translation cannot be stored', async () => {
    const marker = `rollback_${randomUUID().replaceAll('-', '')}`
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION research.${marker}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = '${marker}' THEN RAISE EXCEPTION 'simulated create failure'; END IF; RETURN NEW; END $$`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER ${marker} BEFORE INSERT ON research.initiative_translations FOR EACH ROW EXECUTE FUNCTION research.${marker}()`,
    )
    try {
      await expect(
        createInitiative(
          initiativeCreateSchema.parse({
            content: {
              es: { title: marker, description: 'Descripción' },
              en: { title: marker, description: 'Description' },
            },
          }),
        ),
      ).rejects.toThrow()
      expect(await prisma.initiative.count({ where: { title: marker } })).toBe(0)
      expect(await prisma.initiativeTranslation.count({ where: { title: marker } })).toBe(0)
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER ${marker} ON research.initiative_translations`)
      await prisma.$executeRawUnsafe(`DROP FUNCTION research.${marker}()`)
    }
  })
  test('migrates ISWI and IVIA verbatim in both languages with their links, logos and paragraph order', async () => {
    for (const locale of ['es', 'en'] as const) {
      const records = await getInitiativeRecords(locale)
      const original = getCollaborationsContent(getMessages(locale)).initiatives.items
      for (let index = 0; index < original.length; index++) {
        const item = original[index]!
        const migrated = records.find(
          ({ id }) => id === `01200000-0000-4000-8000-00000000000${index + 1}`,
        )!
        expect(migrated).toMatchObject({
          title: item.title,
          paragraphs: item.paragraphs,
          href: item.href,
          logo: { src: item.logo!.src },
          contentLocale: locale,
        })
        expect(migrated).not.toHaveProperty('editing')
      }
    }
  })
  test('persists both languages and exposes editing metadata only when requested by an authorized caller', async () => {
    const record = await create()
    expect(record.editing).toMatchObject({ content, isLegacy: false })
    const english = (await getInitiativeRecords('en')).find(({ id }) => id === record.id)!
    expect(english).toMatchObject({
      title: content.en.title,
      paragraphs: ['First paragraph.', 'Second paragraph.'],
      href: record.href,
      logo: { src: record.logo!.src },
      contentLocale: 'en',
    })
    expect(english).not.toHaveProperty('editing')
  })
  test('preserves untouched fields and translations when clearing optional values', async () => {
    const record = await create()
    expect(
      await updateInitiative(
        record.id,
        initiativeUpdateSchema.parse({ version: record.editing!.version, logoUrl: '' }),
      ),
    ).toMatchObject({ ok: true })
    const changed = (await getInitiativeRecords('es', { includeEditingData: true })).find(
      ({ id }) => id === record.id,
    )!
    expect(changed.logo).toBeUndefined()
    expect(changed.href).toBe(record.href)
    expect(changed.editing!.content).toEqual(content)
    expect(
      await updateInitiative(record.id, { version: changed.editing!.version, websiteUrl: null }),
    ).toMatchObject({ ok: true })
    expect(await prisma.initiative.findUnique({ where: { id: record.id } })).toMatchObject({
      logoUrl: null,
      websiteUrl: null,
      title: content.es.title,
    })
  })
  test.each(['es', 'en'] as const)(
    'requires review when only %s changes and saves after confirmation',
    async (locale) => {
      const record = await create()
      const next = structuredClone(content)
      next[locale].description += ' Updated.'
      const other = locale === 'es' ? 'en' : 'es'
      const input = { version: record.editing!.version, logoUrl: null, content: next }
      expect(await updateInitiative(record.id, input)).toMatchObject({
        ok: false,
        reason: 'review-required',
        pending: [{ locale: other, field: 'description' }],
      })
      expect(await prisma.initiative.findUnique({ where: { id: record.id } })).toMatchObject({
        logoUrl: record.logo!.src,
        description: content.es.description,
      })
      expect(
        await updateInitiative(record.id, {
          ...input,
          confirmedUnchanged: [{ locale: other, field: 'description' }],
        }),
      ).toMatchObject({ ok: true })
    },
  )
  test('allows exactly one concurrent update to a version and rejects stale retries', async () => {
    const record = await create()
    const results = await Promise.all(
      ['a', 'b'].map((path) =>
        updateInitiative(record.id, {
          version: record.editing!.version,
          websiteUrl: `https://example.com/${path}`,
        }),
      ),
    )
    expect(results.filter(({ ok }) => ok)).toHaveLength(1)
    expect(results.filter(({ ok }) => !ok)).toEqual([{ ok: false, reason: 'conflict' }])
    expect(
      await updateInitiative(record.id, { version: record.editing!.version, logoUrl: null }),
    ).toEqual({ ok: false, reason: 'conflict' })
  })
  test('rolls back base changes and translations when a translation write fails', async () => {
    const record = await create()
    const trigger = `initiative_failure_${record.id.replaceAll('-', '')}`
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION research.${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.initiative_id = '${record.id}'::uuid THEN RAISE EXCEPTION 'simulated translation failure'; END IF; RETURN NEW; END $$`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER ${trigger} BEFORE UPDATE ON research.initiative_translations FOR EACH ROW EXECUTE FUNCTION research.${trigger}()`,
    )
    try {
      await expect(
        updateInitiative(record.id, {
          version: record.editing!.version,
          websiteUrl: null,
          content: {
            es: { title: 'Cambio', description: 'Cambio' },
            en: { title: 'Change', description: 'Change' },
          },
        }),
      ).rejects.toThrow()
      expect(
        await prisma.initiative.findUnique({
          where: { id: record.id },
          include: { translations: true },
        }),
      ).toMatchObject({
        ...content.es,
        websiteUrl: record.href,
        updatedAt: new Date(record.editing!.version),
        translations: [expect.objectContaining(content.en)],
      })
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON research.initiative_translations`)
      await prisma.$executeRawUnsafe(`DROP FUNCTION research.${trigger}()`)
    }
  })
  test('falls back to the untouched original text for legacy rows and can edit their shared fields', async () => {
    const record = await prisma.initiative.create({
      data: { title: `Legacy ${randomUUID()}`, description: 'Original content' },
    })
    ids.push(record.id)
    const legacy = (await getInitiativeRecords('en', { includeEditingData: true })).find(
      ({ id }) => id === record.id,
    )!
    expect(legacy).toMatchObject({
      title: record.title,
      contentLocale: null,
      editing: { isLegacy: true, content: { en: null } },
    })
    expect(
      await updateInitiative(record.id, {
        version: legacy.editing!.version,
        websiteUrl: 'https://example.com',
      }),
    ).toMatchObject({ ok: true })
    expect(await prisma.initiativeTranslation.count({ where: { initiativeId: record.id } })).toBe(0)
  })
  test('deletes translations through the database cascade and handles missing records', async () => {
    const record = await create()
    expect(await deleteInitiative(record.id)).toBe(true)
    expect(await prisma.initiativeTranslation.count({ where: { initiativeId: record.id } })).toBe(0)
    expect(await deleteInitiative(record.id)).toBe(false)
    expect(
      await updateInitiative(record.id, { version: record.editing!.version, logoUrl: null }),
    ).toEqual({ ok: false, reason: 'not-found' })
  })
})
