import { screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { EditModeContext } from '@/app/components/public/cms/EditModeProvider'
import { Default as AcademicActivity } from '@/app/components/public/news/AcademicActivityCard.stories'
import { Default } from '@/app/components/public/news/NewsExplorer.stories'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import type { Locale } from '@/app/lib/i18n/config'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'
import { paginate } from '@/app/lib/pagination'

const mocks = vi.hoisted(() => ({
  locale: 'es' as Locale,
  canManage: false,
  getNewsPage: vi.fn(),
}))

vi.mock('@/app/lib/news', () => ({ getNewsPage: mocks.getNewsPage }))
vi.mock('@/app/lib/auth/authorization', () => ({
  userHasPermission: async () => mocks.canManage,
}))
vi.mock('next-intl/server', () => ({
  getLocale: async () => mocks.locale,
  getMessages: async () => getMessages(mocks.locale),
  getTranslations: async (namespace: 'news.page' | 'common') =>
    createTranslator({ locale: mocks.locale, messages: getMessages(mocks.locale), namespace }),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  usePathname: () => '/noticias',
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}))

import NewsPage, { generateMetadata } from './page'

const articles = Default.args!.news!
const academicActivities = [AcademicActivity.args!.activity!]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.locale = 'es'
  mocks.canManage = false
  mocks.getNewsPage.mockResolvedValue({ ...paginate(articles.length, 1), query: '', articles })
})

describe('News page', () => {
  for (const [locale, title, kicker, lead] of [
    ['es', 'Noticias', 'Portal público LASCE', 'Noticias sobre el trabajo del LASCE.'],
    ['en', 'News', 'LASCE public portal', 'News about LASCE’s work.'],
  ] as const) {
    test(`identifies the page and its metadata as ${title}`, async () => {
      mocks.locale = locale
      renderWithIntl(
        <ToastProvider>
          <EditModeContext.Provider value={{ editMode: false, setEditMode: vi.fn() }}>
            {await NewsPage({ searchParams: Promise.resolve({}) })}
          </EditModeContext.Provider>
        </ToastProvider>,
        { locale },
      )

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(new RegExp(`^${title}$`))
      expect(screen.getByText(kicker, { exact: true })).toBeInTheDocument()
      expect(screen.getByText(lead, { exact: true })).toBeInTheDocument()
      expect(screen.queryByText(/coverage|outreach|cobertura|divulgación/i)).not.toBeInTheDocument()
      for (const activity of academicActivities) {
        expect(screen.queryByRole('heading', { name: activity.title })).not.toBeInTheDocument()
      }
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      for (const article of articles) {
        expect(screen.getByRole('heading', { level: 3, name: article.title })).toBeInTheDocument()
      }

      const metadata = await generateMetadata()
      expect(metadata.title).toBe(`${title} | LASCE`)
      expect(metadata.description).toBe(getMessages(locale).news.page.metaDescription)
      expect(metadata.description).not.toMatch(/coverage|outreach|cobertura|divulgación/i)
    })
  }

  test('limits editing controls to news while preserving the server search and page', async () => {
    mocks.canManage = true
    mocks.getNewsPage.mockResolvedValue({ ...paginate(23, 2), query: 'solar', articles })
    renderWithIntl(
      <ToastProvider>
        <EditModeContext.Provider value={{ editMode: true, setEditMode: vi.fn() }}>
          {await NewsPage({ searchParams: Promise.resolve({ q: 'solar', page: '2' }) })}
        </EditModeContext.Provider>
      </ToastProvider>,
    )

    expect(mocks.getNewsPage).toHaveBeenCalledWith('es', {
      query: 'solar',
      page: 2,
      includeEditingData: true,
    })
    expect(screen.getByRole('button', { name: 'Agregar noticia' })).toBeInTheDocument()
    for (const article of articles) {
      expect(screen.getByRole('button', { name: `Editar ${article.title}` })).toBeInTheDocument()
    }
    for (const activity of academicActivities) {
      expect(screen.queryByRole('heading', { name: activity.title })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: `Editar ${activity.title}` }),
      ).not.toBeInTheDocument()
    }
    expect(screen.getByRole('searchbox')).toHaveValue('solar')
    expect(screen.getByRole('link', { name: 'Página 3' })).toHaveAttribute(
      'href',
      '/noticias?q=solar&page=3',
    )
  })
})
