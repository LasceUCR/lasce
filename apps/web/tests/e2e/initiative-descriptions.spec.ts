import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PREVIEW_LINES = 4

function initiativesRegion(page: Page) {
  return page.getByRole('region', {
    name: 'Iniciativas internacionales de las que LASCE forma parte',
  })
}

/** How many lines `text` takes on screen, from its rendered height and its line height. */
function renderedLines(text: Locator) {
  return text.evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
    return Math.round(element.getBoundingClientRect().height / lineHeight)
  })
}

async function expectAccessibleAndUnscrolled(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page })
    .include('[aria-labelledby="collaborations-initiatives-title"]')
    .analyze()
  expect(accessibility.violations).toEqual([])
}

// Widths at which both seeded descriptions are longer than the preview, so both are cut.
for (const width of [390, 768]) {
  test(`expands initiative descriptions inline with independent keyboard controls at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/colaboraciones-e-iniciativas')
    const initiatives = initiativesRegion(page)
    const controls = initiatives.getByRole('button', { name: 'Leer más' })
    await expect(controls).toHaveCount(2)
    const firstId = await controls.first().getAttribute('aria-controls')
    const secondId = await controls.nth(1).getAttribute('aria-controls')
    const firstText = page.locator(`[id="${firstId}"]`)
    expect(await renderedLines(firstText)).toBeLessThanOrEqual(PREVIEW_LINES)

    await controls.first().focus()
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
    expect(await renderedLines(firstText)).toBeGreaterThan(PREVIEW_LINES)
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
    await expect(controls.first()).toHaveAttribute('aria-expanded', 'false')
    // The whole text stays in the page for assistive technology; on screen it is cut again.
    await expect.poll(() => renderedLines(firstText)).toBeLessThanOrEqual(PREVIEW_LINES)
    await expectAccessibleAndUnscrolled(page)
  })
}

test('shows a description that fits in the preview whole, without a toggle, at 1440px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/colaboraciones-e-iniciativas')
  const initiatives = initiativesRegion(page)
  // The ISWI description fits in four lines at this width; the IVIA one does not.
  const control = initiatives.getByRole('button', { name: 'Leer más' })
  await expect(control).toHaveCount(1)
  await expect(
    initiatives.getByText(/Sin embargo, las actividades de la ISWI continuaron/),
  ).toBeVisible()

  const ivia = page.locator(`[id="${await control.getAttribute('aria-controls')}"]`)
  await expect(ivia).toContainText('Iniciativa VLBI Iberoamericana')
  await control.click()
  const expanded = initiatives.getByRole('button', { name: 'Leer menos' })
  await expect(expanded).toHaveAttribute('aria-expanded', 'true')
  expect(await renderedLines(ivia)).toBeGreaterThan(PREVIEW_LINES)
  expect(await expanded.evaluate((element) => getComputedStyle(element).display)).toMatch(/^inline/)
  await expanded.click()
  await expect.poll(() => renderedLines(ivia)).toBeLessThanOrEqual(PREVIEW_LINES)
  await expectAccessibleAndUnscrolled(page)
})

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
