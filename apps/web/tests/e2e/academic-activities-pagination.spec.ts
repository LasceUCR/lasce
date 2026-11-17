import { randomUUID } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

const ACTIVITY_COUNT = 23

async function createFixtures() {
  const { prisma } = await import('@lasce/db')
  const id = randomUUID().replaceAll('-', '').slice(0, 10)
  const tag = `actividad${id}`
  const user = await prisma.user.create({
    data: {
      institution: 'Institución QA',
      countryCode: 'CR',
      passwordHash: randomUUID(),
      fullName: 'Usuario E2E de paginación',
      email: `activities-pagination-${id}@example.com`,
      role: 'VISITOR',
    },
  })

  const titles = Array.from(
    { length: ACTIVITY_COUNT },
    (_, index) => `Actividad ${index + 1} ${tag}`,
  )

  await prisma.academicActivity.createMany({
    data: titles.map((title, index) => ({
      title,
      category: 'Taller E2E',
      startDate: new Date(Date.UTC(2020, 0, ACTIVITY_COUNT - index)),
      endDate: null,
      location: 'San José',
      description: `Descripción ${tag}.`,
      photoUrl: '/images/mock.jpg',
      photoAlt: 'Imagen de prueba',
      modifiedBy: user.id,
    })),
  })

  return {
    prisma,
    tag,
    titles,
    cleanup: async () => {
      await prisma.academicActivity.deleteMany({ where: { title: { contains: tag } } })
      await prisma.user.delete({ where: { id: user.id } })
    },
  }
}

type Fixtures = Awaited<ReturnType<typeof createFixtures>>

let fixtures: Fixtures

test.beforeEach(async () => {
  fixtures = await createFixtures()
})

test.afterEach(async () => {
  await fixtures.cleanup()
})

function activityList(page: Page) {
  return page.getByRole('region', { name: 'Actividades académicas' })
}

function cards(page: Page) {
  return activityList(page).getByRole('article')
}

function pagination(page: Page) {
  return page.getByRole('navigation', { name: 'Páginas de actividades académicas' })
}

async function shownTitles(page: Page) {
  return cards(page).getByRole('heading', { level: 3 }).allTextContents()
}

function search(query: string, pageNumber?: number) {
  const params = new URLSearchParams({ q: query })
  if (pageNumber) params.set('page', String(pageNumber))
  return `/actividades-academicas?${params.toString()}`
}

function queryOf(page: Page) {
  return Object.fromEntries(new URL(page.url()).searchParams)
}

test('paginates 23 activities as 10, 10 and 3, with every result shown once', async ({ page }) => {
  await page.goto(search(fixtures.tag))

  const seen: string[] = []
  for (const [number, size] of [
    [1, 10],
    [2, 10],
    [3, 3],
  ] as const) {
    if (number > 1) {
      await pagination(page)
        .getByRole('link', { name: `Página ${number}` })
        .click()
    }

    await expect(cards(page)).toHaveCount(size)
    await expect(pagination(page).getByRole('link', { name: `Página ${number}` })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect
      .poll(() => queryOf(page))
      .toEqual(number === 1 ? { q: fixtures.tag } : { q: fixtures.tag, page: String(number) })
    seen.push(...(await shownTitles(page)))
  }

  expect(seen).toEqual(fixtures.titles)
})

test('moves to the new page with keyboard focus on the activity listing', async ({ page }) => {
  await page.goto(search(fixtures.tag))

  await pagination(page).getByRole('link', { name: 'Siguiente' }).focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/page=2/)
  await expect(cards(page).first()).toContainText(fixtures.titles[10]!)
  await expect(activityList(page)).toBeFocused()

  await pagination(page).getByRole('link', { name: 'Anterior' }).click()
  await expect(cards(page).first()).toContainText(fixtures.titles[0]!)
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag })
})

test('canonicalizes invalid and out-of-range page numbers', async ({ page }) => {
  for (const value of ['abc', '0', '-2', '1.5', '1']) {
    await page.goto(`${search(fixtures.tag)}&page=${value}`)

    await expect
      .poll(() => queryOf(page), { message: `page=${value}` })
      .toEqual({ q: fixtures.tag })
    await expect(cards(page)).toHaveCount(10)
  }

  await page.goto(search(fixtures.tag, 99))

  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '3' })
  await expect(cards(page)).toHaveCount(3)
})

test('searches from page one, preserves the query in page links and clears it', async ({
  page,
}) => {
  await page.goto(search(fixtures.tag, 2))
  await expect(cards(page)).toHaveCount(10)

  const searchBox = page.getByRole('searchbox', { name: 'Buscar actividades académicas' })
  await expect(searchBox).toHaveValue(fixtures.tag)

  await searchBox.fill(`Actividad 2 ${fixtures.tag}`)
  await expect.poll(() => queryOf(page)).toEqual({ q: `Actividad 2 ${fixtures.tag}` })
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText(`Actividad 2 ${fixtures.tag}`)
  await expect(pagination(page)).toHaveCount(0)

  await searchBox.fill(fixtures.tag)
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag })
  await pagination(page).getByRole('link', { name: 'Página 2' }).click()
  await expect.poll(() => queryOf(page)).toEqual({ q: fixtures.tag, page: '2' })
  await expect(searchBox).toHaveValue(fixtures.tag)

  await searchBox.fill('')
  await expect(page).toHaveURL(/\/actividades-academicas$/)
  await expect(cards(page)).toHaveCount(10)
})

test('searches the localized activity date shown on its card', async ({ page }) => {
  await page.goto(search('2020'))

  await expect(cards(page)).toHaveCount(10)
  await expect(page.getByText('Se encontraron 23 actividades académicas.')).toBeVisible()
  await expect(cards(page).first()).toContainText('2020')

  await pagination(page).getByRole('link', { name: 'Página 2' }).click()
  await expect(cards(page)).toHaveCount(10)
  await expect.poll(() => queryOf(page)).toEqual({ q: '2020', page: '2' })
  await expect(cards(page).first()).toContainText('2020')
})
