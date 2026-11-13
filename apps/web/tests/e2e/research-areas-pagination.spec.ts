import AxeBuilder from '@axe-core/playwright'

import { test, expect, cards, pagination, switchToEnglish } from './helpers/research-collection'
import { createSignedInUser } from './helpers/admin-users'
import { enableEditMode } from './helpers/edit-mode'

test.use({ viewport: { width: 1600, height: 900 } })

test('paginates the collection without duplicates and exposes only public page data', async ({
  page,
  collection,
}) => {
  await collection.add(23)
  await page.goto('/investigacion')
  const total = collection.baseCount + 23
  const totalPages = Math.ceil(total / 10)
  const seen: string[] = []
  for (let number = 1; number <= totalPages; number += 1) {
    const size = Math.min(10, total - (number - 1) * 10)
    if (number > 1)
      await pagination(page)
        .getByRole('link', { name: `Página ${number}`, exact: true })
        .click()
    await expect(cards(page)).toHaveCount(size)
    const summary = page.getByRole('status').filter({ hasText: /^Mostrando / })
    await expect(summary).toHaveText(
      `Mostrando ${(number - 1) * 10 + 1}–${Math.min(number * 10, total)} de ${total}.`,
    )
    await expect(summary).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(summary).toHaveCSS('border-top-width', '0px')
    await expect(summary).toHaveCSS('padding', '0px')
    await expect(page).toHaveURL(number === 1 ? /\/investigacion$/ : new RegExp(`page=${number}$`))
    await expect(
      pagination(page).getByRole('link', { name: `Página ${number}`, exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    seen.push(...(await cards(page).getByRole('heading', { level: 3 }).allTextContents()))
    const response = await page.request.get(`/api/research-areas?page=${number}`)
    expect(response.ok()).toBe(true)
    const data = await response.json()
    expect(data).toMatchObject({ page: number, pageSize: 10, totalItems: total, totalPages })
    expect(data.areas).toHaveLength(size)
    for (const area of data.areas) expect(area).not.toHaveProperty('editing')
  }
  expect(seen).toEqual([...collection.titles, ...collection.existing.map((area) => area.title)])
  await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agregar área de investigación' })).toHaveCount(0)
})

test('handles empty, ten and eleven areas, including translated empty state and keyboard navigation', async ({
  page,
  collection,
}) => {
  test.skip(collection.baseCount > 10, 'The existing collection already has more than ten areas.')
  if (collection.baseCount === 0) {
    await page.goto('/investigacion?page=9')
    await expect(page).toHaveURL(/\/investigacion$/)
    await expect(page.getByText('No hay áreas de investigación disponibles.')).toBeVisible()
    await expect(pagination(page)).toHaveCount(0)
    await switchToEnglish(page)
    await expect(page.getByText('No research areas are available.')).toBeVisible()
    await page.context().clearCookies()
  }
  await collection.add(10 - collection.baseCount)
  await page.goto('/investigacion')
  await expect(cards(page)).toHaveCount(10)
  await expect(pagination(page)).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: /^Mostrando / })).toHaveCount(0)
  await switchToEnglish(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Research areas' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^Showing / })).toHaveCount(0)
  await page.context().clearCookies()
  await collection.add(1)
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: /^Mostrando / })).toHaveText(
    'Mostrando 1–10 de 11.',
  )
  await expect(pagination(page).getByRole('link', { name: 'Anterior' })).toHaveCount(0)
  await pagination(page).getByRole('link', { name: 'Siguiente' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page)).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: /^Mostrando / })).toHaveText(
    'Mostrando 11–11 de 11.',
  )
  await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
})

test('normalizes invalid and unavailable page numbers in the page and API', async ({
  page,
  collection,
}) => {
  await collection.add(23)
  for (const query of ['page=abc', 'page=0', 'page=-2', 'page=1.5', 'page=1', 'page=2&page=3']) {
    await page.goto(`/investigacion?${query}`)
    await expect(page).toHaveURL(/\/investigacion$/)
    await expect(cards(page)).toHaveCount(10)
    expect(await (await page.request.get(`/api/research-areas?${query}`)).json()).toMatchObject({
      page: 1,
      pageSize: 10,
    })
  }
  for (const value of ['99', '999999999999999999999999999']) {
    await page.goto(`/investigacion?page=${value}`)
    const total = collection.baseCount + 23
    await expect(page).toHaveURL(new RegExp(`page=${Math.ceil(total / 10)}$`))
    await expect(cards(page)).toHaveCount(((total - 1) % 10) + 1)
  }
})

test('preserves the URL page on reload, back, forward, language changes and detail navigation', async ({
  page,
  collection,
}) => {
  await collection.add(23)
  await page.goto('/investigacion')
  await pagination(page).getByRole('link', { name: 'Página 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(collection.titles[10]!)
  await pagination(page).getByRole('link', { name: 'Página 3', exact: true }).click()
  // Both pages can contain ten cards. Wait for the destination before using browser history.
  await expect(page).toHaveURL(/page=3$/)
  await expect(cards(page).first()).toContainText(collection.titles[20]!)
  await expect(cards(page)).toHaveCount(Math.min(10, collection.baseCount + 3))
  await page.goBack()
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(collection.titles[10]!)
  await page.goForward()
  await expect(page).toHaveURL(/page=3$/)
  await expect(cards(page).first()).toContainText(collection.titles[20]!)
  await expect(cards(page)).toHaveCount(Math.min(10, collection.baseCount + 3))
  await page.goBack()
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(collection.titles[10]!)
  await page.reload()
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(collection.titles[10]!)
  await expect(cards(page)).toHaveCount(10)
  await switchToEnglish(page)
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(`Area 11 ${collection.tag}`)
  await expect(cards(page).nth(1).getByRole('heading')).toHaveAttribute('lang', '')
  await expect(cards(page).nth(1)).toContainText(collection.titles[11]!)
  await expect(
    page.getByRole('status').filter({
      hasText: `Showing 11–20 of ${collection.baseCount + 23}.`,
    }),
  ).toBeVisible()
  await expect(pagination(page).getByRole('link', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await cards(page).first().getByRole('link').click()
  await expect(page).toHaveURL(new RegExp(`/investigacion/areas/${collection.ids[10]}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Area 11 ${collection.tag}`)
  await page.goBack()
  await expect(page).toHaveURL(/page=2$/)
  await expect(cards(page).first()).toContainText(`Area 11 ${collection.tag}`)
})

test('refreshes totals after creation and preserves valid pages after deletion', async ({
  page,
  context,
  collection,
}) => {
  const added = 11 - (collection.baseCount % 10)
  await collection.add(added, 'last')
  const total = collection.baseCount + added
  const lastPage = Math.ceil(total / 10)
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto('/administracion')
    await enableEditMode(page)
    await page.goto(`/investigacion?page=${lastPage}`)
    // Uploads have their own form tests. Create through the real API using a repository photo;
    // component tests also assert that the form success handler calls router.refresh().
    const response = await page.request.post('/api/research-areas', {
      data: {
        content: {
          es: { title: `Nueva ${collection.tag}`, description: 'Descripción nueva.' },
          en: { title: `New ${collection.tag}`, description: 'New description.' },
        },
        src: '/images/research/geomagnetismo-costa-rica.jpg',
      },
    })
    expect(response.status()).toBe(201)
    await page.reload()
    await enableEditMode(page)
    await expect(page).toHaveURL(new RegExp(`page=${lastPage}$`))
    await expect(cards(page)).toHaveCount(2)
    await expect(
      page.getByRole('status').filter({
        hasText: `Mostrando ${total}–${total + 1} de ${total + 1}.`,
      }),
    ).toBeVisible()
    for (let remaining = 2; remaining > 0; remaining -= 1) {
      const firstCard = page
        .getByRole('list', { name: /^(Áreas de investigación|Research areas)$/ })
        .getByRole('listitem')
        .first()
      const title = await firstCard.getByRole('heading').innerText()
      await firstCard.getByRole('button', { name: /^Eliminar / }).click()
      await page
        .getByRole('dialog', { name: 'Eliminar área de investigación' })
        .getByRole('button', { name: 'Eliminar', exact: true })
        .click()
      await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0)
      const expectedPage = remaining === 2 ? lastPage : lastPage - 1
      await expect(page).toHaveURL(
        expectedPage === 1 ? /\/investigacion$/ : new RegExp(`page=${expectedPage}$`),
      )
    }
    await expect(cards(page)).toHaveCount(10)
    await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  } finally {
    await account.cleanup()
  }
})

test('shows the empty state after deleting the only remaining area', async ({
  page,
  context,
  collection,
}) => {
  test.skip(collection.baseCount !== 0, 'The empty-state scenario needs an unseeded test database.')
  await collection.add(1)
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto('/administracion')
    await enableEditMode(page)
    await page.goto('/investigacion')
    await page
      .getByRole('button', { name: `Eliminar ${collection.titles[0]}`, exact: true })
      .click()
    await page
      .getByRole('dialog', { name: 'Eliminar área de investigación' })
      .getByRole('button', { name: 'Eliminar', exact: true })
      .click()
    await expect(page.getByText('No hay áreas de investigación disponibles.')).toBeVisible()
    await expect(pagination(page)).toHaveCount(0)
  } finally {
    await account.cleanup()
  }
})

test('keeps controls accessible and within mobile, tablet and desktop widths', async ({
  page,
  collection,
}) => {
  await collection.add(23)
  await page.goto('/investigacion?page=2')
  await expect(cards(page)).toHaveCount(10)
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await expect(pagination(page).getByRole('link', { name: 'Siguiente' })).toBeVisible()
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
})

test('wraps long titles before editor buttons in both languages at every card breakpoint', async ({
  page,
  context,
  collection,
}) => {
  await collection.add(1)
  const titles = {
    es: 'Infraestructura informática y gestión de datos de clima espacial (QA)',
    en: 'Computing infrastructure and space weather data management (QA)',
  }
  await collection.prisma.researchArea.update({
    where: { id: collection.ids[0] },
    data: {
      title: titles.es,
      translations: { updateMany: { where: { locale: 'en' }, data: { title: titles.en } } },
    },
  })
  const account = await createSignedInUser(context, 'ADMIN')
  try {
    await page.goto('/administracion')
    await enableEditMode(page)
    await page.goto('/investigacion')

    for (const locale of ['es', 'en'] as const) {
      if (locale === 'en') await switchToEnglish(page)
      await expect(page.getByRole('heading', { name: titles[locale], exact: true })).toBeVisible()

      for (const width of [320, 375, 700, 701, 740, 768, 820, 900, 1120, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        for (const heading of await cards(page).getByRole('heading', { level: 3 }).all()) {
          const title = await heading.innerText()
          const titleBox = await heading.boundingBox()
          expect(titleBox).not.toBeNull()
          for (const action of locale === 'es' ? ['Editar', 'Eliminar'] : ['Edit', 'Delete']) {
            const button = page.getByRole('button', { name: `${action} ${title}`, exact: true })
            await expect(button).toBeVisible()
            const buttonBox = await button.boundingBox()
            expect(buttonBox).not.toBeNull()
            expect(
              titleBox!.x + titleBox!.width <= buttonBox!.x ||
                titleBox!.y >= buttonBox!.y + buttonBox!.height,
              `${locale} at ${width}px: ${action} overlaps ${title}`,
            ).toBe(true)
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
          false,
        )
        if (width === 768) {
          await cards(page)
            .first()
            .screenshot({ path: test.info().outputPath(`editor-${locale}-768.png`) })
        }
      }
      await page.setViewportSize({ width: 1600, height: 900 })
    }
  } finally {
    await account.cleanup()
  }
})
