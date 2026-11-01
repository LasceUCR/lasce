import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Academic Activities loading & skeleton layout', () => {
  test('displays /actividades-academicas directly with hero and cards when ready', async ({
    page,
  }) => {
    const response = await page.goto('/actividades-academicas')
    expect(response?.status()).toBe(200)

    // Hero renders immediately
    await expect(
      page.getByRole('heading', { level: 1, name: 'Actividades académicas' }),
    ).toBeVisible()

    // Loading region is not busy once activities are displayed
    const loadingRegion = page.locator('#academic-activities-loading-region')
    await expect(loadingRegion).toBeVisible()
    await expect(loadingRegion).not.toHaveAttribute('aria-busy')

    // Loaded card is visible with all its details
    const card = page.locator('.academic-activity-card')
    await expect(card.first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
      }),
    ).toBeVisible()

    // No skeleton elements remain
    await expect(page.locator('[aria-hidden="true"].news-card')).toHaveCount(0)

    // Back link is visible and functional
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible()
  })

  test('displays academic activities section on /noticias alongside news', async ({ page }) => {
    const response = await page.goto('/noticias')
    expect(response?.status()).toBe(200)

    // Section heading renders
    await expect(
      page.getByRole('heading', { level: 2, name: 'Actividades académicas' }),
    ).toBeVisible()

    // Section loading region is not busy when loaded
    const sectionLoading = page.locator('#academic-activities-section-loading').last()
    await expect(sectionLoading).toBeVisible()
    await expect(sectionLoading).not.toHaveAttribute('aria-busy')

    // Rest of the news page remains usable
    await expect(page.getByRole('heading', { level: 1, name: 'Noticias' })).toBeVisible()
    await expect(page.getByRole('searchbox')).toBeVisible()
  })

  test('adapts layout across mobile, tablet and desktop viewports without horizontal scrolling', async ({
    page,
  }) => {
    await page.goto('/actividades-academicas')
    await expect(page.locator('.academic-activity-card').first()).toBeVisible()

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
    }
  })

  test('passes automated accessibility checks on /actividades-academicas', async ({ page }) => {
    await page.goto('/actividades-academicas')
    await expect(page.locator('.academic-activity-card').first()).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
