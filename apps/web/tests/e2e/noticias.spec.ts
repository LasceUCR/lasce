import { expect, test, type Page } from '@playwright/test'

// Runs against the seeded news (`pnpm db:seed`, which CI runs before this suite).

function newsList(page: Page) {
  return page.getByRole('region', { name: 'Noticias recientes' })
}

test('lists news as compact, text-only cards that open the source article', async ({ page }) => {
  await page.goto('/noticias')

  const cards = newsList(page).getByRole('article')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(0)

  await expect(newsList(page).locator('img')).toHaveCount(0)

  const first = cards.first()
  await expect(first.getByRole('heading', { level: 3 })).toBeVisible()
  const link = first.getByRole('link', {
    name: /^Abrir fuente de «.+» \(se abre en una pestaña nueva\)$/,
  })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('href', /^https?:\/\//)
})

test('keeps news in chronological order, newest first and undated last', async ({ page }) => {
  await page.goto('/noticias')

  const cards = newsList(page).getByRole('article')
  await expect(cards.first()).toBeVisible()
  const dates = await cards.evaluateAll((articles) =>
    articles.map((article) => article.querySelector('time')?.getAttribute('datetime') ?? null),
  )

  const dated = dates.filter((date): date is string => date !== null)
  expect(dated).toEqual([...dated].sort().reverse())
  // Every undated item comes after the last dated one.
  const firstUndated = dates.indexOf(null)
  if (firstUndated !== -1) {
    expect(dates.slice(firstUndated).every((date) => date === null)).toBe(true)
  }
})

test('fits the news cards to the screen at every width without sideways scrolling', async ({
  page,
}) => {
  await page.goto('/noticias')
  await expect(newsList(page).getByRole('article').first()).toBeVisible()

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })

    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      const list = document.querySelector('.news-list')
      const listRight = list?.getBoundingClientRect().right ?? Infinity
      return (
        root.scrollWidth > root.clientWidth ||
        Array.from(document.querySelectorAll('.news-list article')).some(
          (card) => card.getBoundingClientRect().right > listRight + 0.5,
        )
      )
    })

    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
  }
})
