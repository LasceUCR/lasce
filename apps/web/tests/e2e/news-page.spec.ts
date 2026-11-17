import { expect, test } from '@playwright/test'

import type { AcademicActivity } from '@/app/lib/academic-activities'
import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

import { expectNewsIdentity } from './helpers/news-page'

test.describe('News identity and content separation', () => {
  for (const locale of ['es', 'en'] as const) {
    test(`shows only news in ${locale} and preserves the dedicated activities`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: 'lasce_locale', value: locale, url: 'http://localhost:3000' },
      ])
      const messages = { es, en }[locale]
      const response = await context.request.get('/api/academic-activities')
      expect(response.ok()).toBe(true)
      const { activities } = (await response.json()) as { activities: AcademicActivity[] }
      expect(activities.length).toBeGreaterThan(0)

      await page.goto('/noticias')
      await expectNewsIdentity(page, locale)
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { level: 2 })).toHaveText(messages.news.page.recent)
      for (const activity of activities) {
        await expect(main.getByRole('heading', { name: activity.title })).toHaveCount(0)
      }
      await expect(main.getByRole('searchbox')).toBeVisible()
      await expect(
        main.getByRole('article').getByRole('heading', { level: 3 }).first(),
      ).toBeVisible()

      await page.goto('/actividades-academicas')
      await expect(main.getByRole('heading', { level: 1 })).toHaveText(
        messages.academicActivities.listPage.title,
      )
      for (const activity of activities) {
        const card = main
          .getByRole('article')
          .filter({
            has: page.getByRole('heading', { level: 3, name: activity.title, exact: true }),
          })
          .last()
        await expect(card).toBeVisible()
        await expect(card).toContainText(activity.category)
        await expect(card).toContainText(activity.date)
        if (activity.location) await expect(card).toContainText(activity.location)
        await expect(card).toContainText(activity.description.replaceAll('\n\n', ' '))
        const image = card.getByRole('img', { name: activity.photoAlt })
        await expect(image).toBeVisible()
        const src = new URL((await image.getAttribute('src'))!, page.url())
        expect(new URL(src.searchParams.get('url') ?? src.href, page.url()).href).toBe(
          new URL(activity.photoUrl, page.url()).href,
        )
      }
    })
  }
})
