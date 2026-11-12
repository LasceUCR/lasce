import { expect, type Page } from '@playwright/test'

import type { Locale } from '@/app/lib/i18n/config'

const identity = {
  es: {
    title: 'Noticias',
    kicker: 'Portal público LASCE',
    lead: 'Noticias recientes',
    description:
      'Noticias del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
  },
  en: {
    title: 'News',
    kicker: 'LASCE public portal',
    lead: 'Recent news',
    description:
      'News from the Solar Astrophysics and Space Weather Laboratory of the University of Costa Rica.',
  },
} satisfies Record<Locale, { title: string; kicker: string; lead: string; description: string }>

/** The localized hero and metadata identify news, with no coverage or outreach wording. */
export async function expectNewsIdentity(page: Page, locale: Locale) {
  const { title, kicker, lead, description } = identity[locale]
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(title)
  const hero = main.locator('header')
  await expect(hero.getByText(kicker, { exact: true })).toBeVisible()
  await expect(hero.getByText(lead, { exact: true })).toBeVisible()
  await expect(hero).not.toContainText(/coverage|outreach|cobertura|divulgación/i)
  await expect(page).toHaveTitle(`${title} | LASCE`)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description)
}
