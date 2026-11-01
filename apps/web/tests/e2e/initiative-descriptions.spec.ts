import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const width of [390, 1440]) {
  test(`expands initiative descriptions inline with independent keyboard controls at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/colaboraciones-e-iniciativas')
    const initiatives = page.getByRole('region', {
      name: 'Iniciativas internacionales de las que LASCE forma parte',
    })
    const controls = initiatives.getByRole('button', { name: 'Leer más' })
    await expect(controls).toHaveCount(2)
    const first = controls.first()
    const firstId = await first.getAttribute('aria-controls')
    const secondId = await controls.nth(1).getAttribute('aria-controls')
    const toggle = initiatives.getByRole('button').filter({ hasText: 'Leer más' }).first()
    await toggle.focus()
    await page.keyboard.press('Enter')
    const expanded = initiatives.getByRole('button', { name: 'Leer menos' })
    await expect(expanded).toBeFocused()
    await expect(expanded).toHaveAttribute('aria-controls', firstId!)
    await expect(expanded).toHaveAttribute('aria-expanded', 'true')
    await expect(initiatives.getByRole('button', { name: 'Leer más' })).toHaveAttribute(
      'aria-controls',
      secondId!,
    )
    await expect(
      initiatives.getByText(/Sin embargo, las actividades de la ISWI continuaron/),
    ).toBeVisible()
    expect(await expanded.evaluate((element) => getComputedStyle(element).display)).toMatch(
      /^inline/,
    )
    expect((await expanded.boundingBox())!.width).toBeLessThan(120)
    await page.screenshot({
      path: testInfo.outputPath(`initiatives-expanded-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    })
    await page.keyboard.press('Space')
    await expect(initiatives.getByRole('button', { name: 'Leer más' })).toHaveCount(2)
    await expect(
      initiatives.getByText(/Sin embargo, las actividades de la ISWI continuaron/),
    ).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const accessibility = await new AxeBuilder({ page })
      .include('[aria-labelledby="collaborations-initiatives-title"]')
      .analyze()
    expect(accessibility.violations).toEqual([])
  })
}

test('skips the expansion animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/colaboraciones-e-iniciativas')
  const first = page.getByRole('button', { name: 'Leer más' }).first()
  await first.click()
  await expect(page.getByRole('button', { name: 'Leer menos' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(
    await page
      .getByRole('button', { name: 'Leer menos' })
      .evaluate((element) => element.closest('div')!.getAnimations().length),
  ).toBe(0)
})
