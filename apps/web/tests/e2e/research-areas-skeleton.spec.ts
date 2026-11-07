import AxeBuilder from '@axe-core/playwright'

import { test, expect, cards } from './helpers/research-collection'

// Block the real SELECT, rather than slowing the browser or adding production test delays.
// Each lock is released in finally; run only against a local test database or CI service.
for (const width of [320, 768, 1440]) {
  test(`streams the static page and replaces responsive skeletons at ${width}px`, async ({
    page,
    collection,
  }) => {
    const database = new URL(process.env.DATABASE_URL!)
    test.skip(
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
        (!process.env.CI && !database.pathname.endsWith('_test')),
      'Holding database reads requires a local disposable test database.',
    )
    await collection.add(3)
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Warm compilation, but not research data (there is no query cache).
    await page.goto('/investigacion')
    await expect(cards(page)).toHaveCount(Math.min(10, collection.baseCount + 3))
    let unlock!: () => void
    let locked!: () => void
    const release = new Promise<void>((resolve) => {
      unlock = resolve
    })
    const acquired = new Promise<void>((resolve) => {
      locked = resolve
    })
    const transaction = collection.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe('LOCK TABLE areas.research_areas IN ACCESS EXCLUSIVE MODE')
        locked()
        await release
      },
      { timeout: 15_000 },
    )
    let skeletonBox: { x: number; width: number; height: number } | null = null
    try {
      await Promise.race([acquired, transaction])
      await page.goto('/investigacion', { waitUntil: 'commit' })
      const loading = page.getByRole('region', { name: 'Áreas de investigación' })
      await expect(loading).toHaveAttribute('aria-busy', 'true')
      await expect(loading.getByRole('status')).toHaveText('Cargando áreas de investigación…')
      await expect(
        page.getByRole('heading', { name: 'Áreas de investigación', level: 1 }),
      ).toBeVisible()
      await expect(
        page.getByText('Principales ramas de investigación desarrolladas por el LASCE.'),
      ).toBeVisible()
      await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
      await expect(loading.getByRole('link')).toHaveCount(0)
      await expect(loading.getByRole('list')).toHaveCount(0)
      await expect(loading.locator('ul')).toHaveAttribute('inert', '')
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      )
      // CSS geometry/animation checks intentionally inspect the decorative shapes.
      const shape = loading.locator('.research-area-card-image').first()
      expect(await shape.evaluate((element) => getComputedStyle(element).animationName)).toBe(
        'none',
      )
      skeletonBox = await loading.locator('.research-area-card').first().boundingBox()
      await page.screenshot({
        path: test.info().outputPath(`skeleton-${width}.png`),
        fullPage: true,
      })
    } finally {
      unlock()
      await transaction
    }
    await expect(cards(page)).toHaveCount(Math.min(10, collection.baseCount + 3))
    await expect(page.getByText('Cargando áreas de investigación…')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Áreas de investigación' })).toHaveAttribute(
      'aria-busy',
      'false',
    )
    const loadedBox = await cards(page).first().boundingBox()
    expect(skeletonBox).not.toBeNull()
    expect(loadedBox).not.toBeNull()
    expect(Math.abs(loadedBox!.x - skeletonBox!.x)).toBeLessThan(2)
    expect(Math.abs(loadedBox!.width - skeletonBox!.width)).toBeLessThan(2)
    expect(Math.abs(loadedBox!.height - skeletonBox!.height)).toBeLessThan(45)
    expect(
      (
        await new AxeBuilder({ page })
          .include('#research-areas')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([])
  })
}
