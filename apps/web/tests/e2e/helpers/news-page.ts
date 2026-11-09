import { expect, type Page } from '@playwright/test'

import type { Locale } from '@/app/lib/i18n/config'

const identity = {
  es: {
    title: 'Noticias',
    description:
      'Noticias del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
  },
  en: {
    title: 'News',
    description:
      'News from the Solar Astrophysics and Space Weather Laboratory of the University of Costa Rica.',
  },
} satisfies Record<Locale, { title: string; description: string }>

/** The hero contains only the localized h1; metadata describes the same news page. */
export async function expectNewsIdentity(page: Page, locale: Locale) {
  const { title, description } = identity[locale]
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(title)
  await expect(main.locator('header')).toHaveText(title)
  await expect(page).toHaveTitle(`${title} | LASCE`)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description)
}
