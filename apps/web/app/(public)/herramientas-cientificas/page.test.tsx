import { screen, within } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { Default } from '@/app/components/public/scientific-tools/ScientificToolsManager.stories'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import ScientificToolsRoute, { generateMetadata } from './page'

const request = vi.hoisted(() => ({
  locale: 'es' as 'es' | 'en',
  grants: new Set<string>(),
  records: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getLocale: async () => request.locale,
  getTranslations: async (namespace: 'scientificTools' | 'common') =>
    createTranslator({ locale: request.locale, messages: getMessages(request.locale), namespace }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/lib/auth/authorization', () => ({
  userHasPermission: async (grant: string) => request.grants.has(grant),
}))
vi.mock('@/app/lib/scientific-tool-records', () => ({
  getScientificToolRecords: request.records,
}))

const tools = Default.args!.tools!

beforeEach(() => {
  request.grants = new Set()
  request.records.mockReset()
  request.records.mockResolvedValue(tools)
})

describe('ScientificToolsRoute', () => {
  test.each(['es', 'en'] as const)(
    'groups the tools under a named section and provides home navigation in %s',
    async (locale) => {
      request.locale = locale
      const messages = getMessages(locale)
      const { hero, list } = messages.scientificTools

      renderWithIntl(
        <ToastProvider>
          <EditModeProvider>{await ScientificToolsRoute()}</EditModeProvider>
        </ToastProvider>,
        { locale },
      )

      expect(screen.getByRole('heading', { level: 1, name: hero.title })).toBeInTheDocument()
      expect(screen.getByText(hero.intro)).toBeInTheDocument()
      const section = screen.getByRole('region', { name: list.title })
      expect(
        within(section).getByRole('heading', { level: 2, name: list.title }),
      ).toBeInTheDocument()
      expect(within(section).getAllByRole('article')).toHaveLength(2)
      expect(request.records).toHaveBeenCalledWith(locale, { includeEditingData: false })
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

  test('requests the editing data only for an account that can edit', async () => {
    request.locale = 'es'
    request.grants = new Set(['edit_components'])

    renderWithIntl(
      <ToastProvider>
        <EditModeProvider>{await ScientificToolsRoute()}</EditModeProvider>
      </ToastProvider>,
    )

    expect(request.records).toHaveBeenCalledWith('es', { includeEditingData: true })
  })

  test('shows the empty state when there are no tools or they cannot be read', async () => {
    request.locale = 'es'
    const empty = getMessages('es').scientificTools.list.empty
    request.records.mockResolvedValueOnce([])
    const first = renderWithIntl(
      <ToastProvider>
        <EditModeProvider>{await ScientificToolsRoute()}</EditModeProvider>
      </ToastProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent(empty)
    first.unmount()

    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    request.records.mockRejectedValueOnce(new Error('database unavailable'))
    renderWithIntl(
      <ToastProvider>
        <EditModeProvider>{await ScientificToolsRoute()}</EditModeProvider>
      </ToastProvider>,
    )
    const section = screen.getByRole('region', {
      name: getMessages('es').scientificTools.list.title,
    })
    expect(within(section).getByRole('status')).toHaveTextContent(empty)
    expect(within(section).queryByRole('article')).not.toBeInTheDocument()
    expect(logged).toHaveBeenCalled()
  })

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
