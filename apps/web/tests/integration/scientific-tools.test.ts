import { randomUUID } from 'node:crypto'
import { prisma } from '@lasce/db'
import { afterAll, describe, expect, test } from 'vitest'
import { getScientificToolRecords } from '@/app/lib/scientific-tool-records'
import {
  scientificToolCreateSchema,
  scientificToolUpdateSchema,
} from '@/app/lib/scientific-tool-schema'
import {
  createScientificTool,
  deleteScientificTool,
  updateScientificTool,
} from '@/app/lib/scientific-tool-writes'

const actor = { id: 'user-1' }
const ids: string[] = []
const content = {
  es: { description: 'Herramienta de integración.' },
  en: { description: 'Integration tool.' },
}

async function create(name = `Tool ${randomUUID().slice(0, 8)}`) {
  const result = await createScientificTool(
    scientificToolCreateSchema.parse({ name, accessUrl: 'https://tool.example.com/', content }),
    actor,
  )
  if (!result.ok) throw new Error(result.reason)
  ids.push(result.value.id)
  return (await getScientificToolRecords('es', { includeEditingData: true })).find(
    ({ id }) => id === result.value.id,
  )!
}

afterAll(async () => {
  await prisma.scientificTool.deleteMany({ where: { id: { in: ids } } })
  await prisma.auditEvent.deleteMany({ where: { entityId: { in: ids } } })
  await prisma.$disconnect()
})

describe('scientific tool persistence', () => {
  test('stores both languages, lists new tools last and hides editing data from visitors', async () => {
    const first = await create()
    const second = await create()
    const english = await getScientificToolRecords('en')
    const order = english.map(({ id }) => id)
    expect(order.indexOf(second.id)).toBeGreaterThan(order.indexOf(first.id))
    const read = english.find(({ id }) => id === first.id)!
    expect(read).toMatchObject({ description: content.en.description, contentLocale: 'en' })
    expect(read).not.toHaveProperty('editing')
    expect(first.editing).toMatchObject({ content, isLegacy: false })
    expect(
      await prisma.auditEvent.count({
        where: { entityId: first.id, action: 'scientific_tool.create' },
      }),
    ).toBe(1)
  })

  test('rolls back the tool when its English translation cannot be stored', async () => {
    const marker = `rollback_${randomUUID().replaceAll('-', '')}`
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION public.${marker}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.description = '${marker}' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END $$`,
    )
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER ${marker} BEFORE INSERT ON public.scientific_tool_translations FOR EACH ROW EXECUTE FUNCTION public.${marker}()`,
    )
    try {
      await expect(
        createScientificTool(
          scientificToolCreateSchema.parse({
            name: marker.slice(0, 100),
            accessUrl: 'https://tool.example.com/',
            content: { es: { description: marker }, en: { description: marker } },
          }),
          actor,
        ),
      ).rejects.toThrow()
      expect(await prisma.scientificTool.count({ where: { description: marker } })).toBe(0)
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER ${marker} ON public.scientific_tool_translations`,
      )
      await prisma.$executeRawUnsafe(`DROP FUNCTION public.${marker}()`)
    }
  })

  test('keeps translations on a shared-field edit and rejects a stale version', async () => {
    const tool = await create()
    const version = tool.editing!.version
    expect(
      await updateScientificTool(
        tool.id,
        scientificToolUpdateSchema.parse({ version, accessUrl: 'https://new.example.com/' }),
        actor,
      ),
    ).toMatchObject({ ok: true })
    expect(await updateScientificTool(tool.id, { version, name: 'Stale' }, actor)).toEqual({
      ok: false,
      reason: 'conflict',
    })
    const stored = await prisma.scientificTool.findUniqueOrThrow({
      where: { id: tool.id },
      include: { translations: true },
    })
    expect(stored).toMatchObject({ name: tool.name, accessUrl: 'https://new.example.com/' })
    expect(stored.translations).toEqual([
      expect.objectContaining({ locale: 'en', description: content.en.description }),
    ])
  })

  test('deletes a tool together with its translations', async () => {
    const tool = await create()
    expect(await deleteScientificTool(tool.id, actor)).toBe(true)
    expect(
      await prisma.scientificToolTranslation.count({ where: { scientificToolId: tool.id } }),
    ).toBe(0)
    expect(await deleteScientificTool(tool.id, actor)).toBe(false)
  })
})
