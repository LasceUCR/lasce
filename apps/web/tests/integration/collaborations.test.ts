import { randomUUID } from 'node:crypto'

import { prisma } from '@lasce/db'
import { afterAll, describe, expect, test } from 'vitest'

import { getCollaborationRecords } from '@/app/lib/collaboration-records'
import { getMessages } from '@/app/lib/i18n/messages'
import { getResearchCollaborations } from '@/app/lib/research-collaborations'

// The integration setup checks for an explicitly selected disposable *_test database.
const ids: string[] = []

async function createOrganization(country: string, translatedCountry?: string) {
  const id = randomUUID()
  ids.push(id)
  return prisma.collaboration.create({
    data: {
      id,
      name: `Collaboration ${id}`,
      acronym: 'QA',
      scope: 'INTERNATIONAL',
      position: ids.length,
      country,
      ...(translatedCountry
        ? { translations: { create: { locale: 'en', country: translatedCountry } } }
        : {}),
    },
  })
}

afterAll(async () => {
  await prisma.collaboration.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('stored collaboration translations', () => {
  test('preserves the original directory and its country translations after migration', async () => {
    for (const locale of ['es', 'en'] as const) {
      const original = getResearchCollaborations(getMessages(locale).collaborations.countries)
      const names = new Set(original.map(({ name }) => name))
      const migrated = (await getCollaborationRecords(locale)).filter(({ name }) => names.has(name))

      expect(
        migrated.map(({ name, acronym, country, scope }) => ({ name, acronym, country, scope })),
      ).toEqual(
        original.map(({ name, acronym, country, scope }) => ({ name, acronym, country, scope })),
      )
    }
  })

  test('resolves each record in both languages and reads updated translations', async () => {
    const italy = await createOrganization('Italia', 'Italy')
    const germany = await createOrganization('Alemania', 'Germany')

    for (const [locale, countries] of [
      ['es', ['Italia', 'Alemania']],
      ['en', ['Italy', 'Germany']],
    ] as const) {
      const records = (await getCollaborationRecords(locale)).filter((record) =>
        [italy.id, germany.id].includes(record.id),
      )
      expect(
        records.map(({ id, country, countryLocale }) => ({ id, country, countryLocale })),
      ).toEqual([
        { id: italy.id, country: countries[0], countryLocale: locale },
        { id: germany.id, country: countries[1], countryLocale: locale },
      ])
      expect(records[0]).toMatchObject({ name: italy.name, acronym: 'QA', scope: 'international' })
    }

    await prisma.collaborationTranslation.update({
      where: { collaborationId_locale: { collaborationId: germany.id, locale: 'en' } },
      data: { country: 'Federal Republic of Germany' },
    })
    expect((await getCollaborationRecords('en')).find(({ id }) => id === germany.id)?.country).toBe(
      'Federal Republic of Germany',
    )
  })

  test('falls back when a record has no translation and removes translations with its parent', async () => {
    const record = await createOrganization('Francia')
    expect((await getCollaborationRecords('en')).find(({ id }) => id === record.id)).toMatchObject({
      country: 'Francia',
      countryLocale: null,
    })

    await prisma.collaborationTranslation.create({
      data: { collaborationId: record.id, locale: 'en', country: 'France' },
    })
    await expect(
      prisma.collaborationTranslation.create({
        data: { collaborationId: record.id, locale: 'en', country: 'France' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })

    await prisma.collaboration.delete({ where: { id: record.id } })
    expect(
      await prisma.collaborationTranslation.count({ where: { collaborationId: record.id } }),
    ).toBe(0)
  })
})
