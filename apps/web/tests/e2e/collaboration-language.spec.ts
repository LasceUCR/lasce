import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const envPath = path.resolve(process.cwd(), '../../.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

test.use({ viewport: { width: 1600, height: 900 } })

test.describe('collaboration language', () => {
  test('switches countries and classifications on the same page and preserves organization identity', async ({
    page,
  }) => {
    await page.goto('/colaboraciones-e-iniciativas')
    const organizations = page.getByRole('region', { name: 'Colaboraciones de investigación' })
    const names = await organizations.getByRole('heading', { level: 3 }).allTextContents()
    const logos = await page
      .getByRole('main')
      .getByRole('img')
      .evaluateAll((images) =>
        images.map((image) => new URL(image.getAttribute('src')!, document.baseURI).href),
      )
    await expect(organizations.getByText('Nacional', { exact: true })).toHaveCount(2)
    await expect(organizations.getByText('Internacional', { exact: true })).toHaveCount(6)
    await expect(organizations.getByText('Italia', { exact: true })).toHaveCount(2)

    await page.getByRole('banner').getByLabel('Idioma: Español').click()
    await page.getByRole('banner').getByRole('button', { name: 'English' }).click()

    const english = page.getByRole('region', { name: 'Research collaborations' })
    await expect(page).toHaveURL(/\/colaboraciones-e-iniciativas$/)
    await expect(english.getByRole('heading', { level: 3 })).toHaveText(names)
    await expect(english.getByText('National', { exact: true })).toHaveCount(2)
    await expect(english.getByText('International', { exact: true })).toHaveCount(6)
    await expect(english.getByText('Italy', { exact: true })).toHaveCount(2)
    await expect(english.getByText('France', { exact: true })).toBeVisible()
    await expect(english.getByText('Mexico', { exact: true })).toHaveCount(2)
    await expect(
      page
        .getByRole('article', { name: 'Ibero-American VLBI Initiative (IVIA)', exact: true })
        .getByRole('link'),
    ).toHaveAttribute('href', 'https://oaq.epn.edu.ec/ivia-net/index.php/es/')
    expect(
      await page
        .getByRole('main')
        .getByRole('img')
        .evaluateAll((images) =>
          images.map((image) => new URL(image.getAttribute('src')!, document.baseURI).href),
        ),
    ).toEqual(logos)

    await page.reload()
    await expect(english.getByText('Italy', { exact: true })).toHaveCount(2)
    await page.getByRole('banner').getByLabel('Language: English').click()
    await page.getByRole('banner').getByRole('button', { name: 'Español' }).click()
    await expect(organizations.getByText('Italia', { exact: true })).toHaveCount(2)
    await expect(organizations.getByRole('heading', { level: 3 })).toHaveText(names)
    await expect(page).toHaveURL(/\/colaboraciones-e-iniciativas$/)
  })

  test('renders newly stored translations and missing-translation fallback on the public page', async ({
    context,
    page,
  }) => {
    const { prisma } = await import('@lasce/db')
    const ids = [randomUUID(), randomUUID()]
    const names = ids.map((id) => `QA partner ${id}`)
    try {
      await prisma.collaboration.create({
        data: {
          id: ids[0],
          name: names[0]!,
          country: 'Alemania',
          acronym: 'QA-DE',
          scope: 'INTERNATIONAL',
          position: 100,
          translations: { create: { locale: 'en', country: 'Germany' } },
        },
      })
      await prisma.collaboration.create({
        data: {
          id: ids[1],
          name: names[1]!,
          country: 'Francia',
          scope: 'INTERNATIONAL',
          position: 101,
        },
      })
      await context.addCookies([
        { name: 'lasce_locale', value: 'en', url: 'http://localhost:3000' },
      ])
      await page.goto('/colaboraciones-e-iniciativas')

      const translated = page
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { name: names[0], exact: true }) })
        .last()
      const fallback = page
        .getByRole('article')
        .filter({ has: page.getByRole('heading', { name: names[1], exact: true }) })
        .last()
      await expect(translated.getByText('Germany', { exact: true })).toHaveAttribute('lang', 'en')
      await expect(translated.getByText('QA-DE', { exact: false })).toBeVisible()
      await expect(fallback.getByText('Francia', { exact: true })).toHaveAttribute('lang', '')
      await expect(fallback.getByText('International', { exact: true })).toBeVisible()

      await page.getByRole('banner').getByLabel('Language: English').click()
      await page.getByRole('banner').getByRole('button', { name: 'Español' }).click()
      await expect(translated.getByText('Alemania', { exact: true })).toHaveAttribute('lang', 'es')
      await expect(fallback.getByText('Francia', { exact: true })).toBeVisible()
    } finally {
      await prisma.collaboration.deleteMany({ where: { id: { in: ids } } })
      await prisma.$disconnect()
    }
  })
})
