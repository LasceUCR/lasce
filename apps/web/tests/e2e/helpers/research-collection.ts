import { randomUUID } from 'node:crypto'

import { test as base, expect, type Page } from '@playwright/test'

async function collection() {
  const { prisma } = await import('@lasce/db')
  const existing = await prisma.researchArea.findMany({
    select: { id: true, title: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  const tag = `pagination-${randomUUID()}`
  const idPrefix = randomUUID().slice(0, 24)
  const ids: string[] = []
  const titles: string[] = []
  return {
    prisma,
    existing,
    baseCount: existing.length,
    tag,
    ids,
    titles,
    async add(count: number, position: 'first' | 'last' = 'first') {
      const createdAt =
        position === 'first'
          ? new Date(Math.max(Date.now(), existing[0]?.createdAt.getTime() ?? 0) + 60_000)
          : new Date((existing.at(-1)?.createdAt.getTime() ?? Date.now()) - 60_000)
      for (let index = 0; index < count; index += 1) {
        const number = ids.length + 1
        const id = `${idPrefix}${String(1000 - number).padStart(12, '0')}`
        const title = `Área ${number} ${tag}`
        await prisma.researchArea.create({
          data: {
            id,
            title,
            description: `Descripción del área ${number}.`,
            src: '/images/research/geomagnetismo-costa-rica.jpg',
            // All dates tie: the ID must determine page boundaries, independently of language.
            createdAt,
            ...(number === 12
              ? {}
              : {
                  translations: {
                    create: {
                      locale: 'en',
                      title: `Area ${number} ${tag}`,
                      description: `Description of area ${number}.`,
                    },
                  },
                }),
          },
        })
        ids.push(id)
        titles.push(title)
      }
    },
    async cleanup() {
      await prisma.researchArea.deleteMany({
        where: { OR: [{ id: { in: ids } }, { title: { contains: tag } }] },
      })
    },
  }
}

export const test = base.extend<{ collection: Awaited<ReturnType<typeof collection>> }>({
  collection: async ({ baseURL: _baseURL }, use) => {
    const fixtures = await collection()
    try {
      await use(fixtures)
    } finally {
      await fixtures.cleanup()
    }
  },
})
export { expect }

export const cards = (page: Page) =>
  page.getByRole('list', { name: /^(Áreas de investigación|Research areas)$/ }).getByRole('article')
export const pagination = (page: Page) =>
  page.getByRole('navigation', {
    name: /^(Páginas de áreas de investigación|Research area pages)$/,
  })

export async function switchToEnglish(page: Page) {
  await page.getByRole('banner').getByLabel('Idioma: Español').click()
  await page.getByRole('banner').getByRole('button', { name: 'English', exact: true }).click()
}
