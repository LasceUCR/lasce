import { screen, within } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { describe, expect, test, vi } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import ScientificToolsRoute, { generateMetadata } from './page'

const request = vi.hoisted(() => ({ locale: 'es' as 'es' | 'en' }))

vi.mock('next-intl/server', () => ({
  getMessages: async () => getMessages(request.locale),
  getTranslations: async (namespace: 'scientificTools' | 'common') =>
    createTranslator({ locale: request.locale, messages: getMessages(request.locale), namespace }),
}))

describe('ScientificToolsRoute', () => {
  test.each(['es', 'en'] as const)(
    'groups the tools under a named section and provides home navigation in %s',
    async (locale) => {
      request.locale = locale
      const messages = getMessages(locale)
      const { hero, list } = messages.scientificTools

      renderWithIntl(await ScientificToolsRoute(), { locale })

      expect(screen.getByRole('heading', { level: 1, name: hero.title })).toBeInTheDocument()
      expect(screen.getByText(hero.intro)).toBeInTheDocument()
      const section = screen.getByRole('region', { name: list.title })
      expect(
        within(section).getByRole('heading', { level: 2, name: list.title }),
      ).toBeInTheDocument()
      expect(within(section).getAllByRole('article')).toHaveLength(2)
      for (const title of ['SWAAT', 'SWAPRO']) {
        expect(within(section).getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
      }

      const backLink = screen.getByRole('link', { name: messages.common.backToHome })
      expect(backLink).toHaveAttribute('href', '/')
      expect(section).not.toContainElement(backLink)
      expect(
        section.compareDocumentPosition(backLink) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    },
  )

  test.each(['es', 'en'] as const)(
    'uses the institutional introduction in %s metadata',
    async (locale) => {
      request.locale = locale
      const messages = getMessages(locale).scientificTools

      expect(await generateMetadata()).toEqual({
        title: messages.meta.title,
        description: messages.hero.intro,
        alternates: { canonical: '/herramientas-cientificas' },
      })
    },
  )
})
