import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { EditModeProvider } from '@/app/components/public/cms/EditModeProvider'
import { ToastProvider } from '@/app/components/public/toast/ToastProvider'
import { getContactContent } from '@/app/lib/contact'
import type { Locale } from '@/app/lib/i18n/config'
import { getMessages } from '@/app/lib/i18n/messages'
import { renderWithIntl } from '@/app/lib/i18n/testing'

import { ContactPage, type ContactPageProps } from './ContactPage'
import { Default, OmitsIncompleteChannels } from './ContactPage.stories'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const defaultArgs = Default.args as ContactPageProps
const incompleteArgs = OmitsIncompleteChannels.args as ContactPageProps

function renderPage(ui: ReactElement, locale: Locale = 'es') {
  return renderWithIntl(
    <ToastProvider>
      <EditModeProvider>{ui}</EditModeProvider>
    </ToastProvider>,
    { locale },
  )
}

function sectionHeadings(): (string | undefined)[] {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.trim())
}

describe('ContactPage', () => {
  test('shows the official channels under a single page heading', async () => {
    renderPage(<ContactPage {...defaultArgs} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Contacto' })).toBeInTheDocument()
    expect(sectionHeadings()).toEqual(['Ubicación', 'Información de contacto'])
    expect(screen.getByRole('heading', { level: 3, name: 'Teléfono' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2511-6566' })).toHaveAttribute(
      'href',
      'tel:+50625116566',
    )
    const location = screen.getByRole('region', { name: 'Ubicación' })
    expect(location).toHaveTextContent(defaultArgs.content.location.address)
    expect(
      await screen.findByRole('region', { name: 'Mapa de ubicación de LASCE' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/código postal/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/lasce_ucr/',
    )
    expect(screen.queryByText('Contenido en preparación')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correo electrónico' })).not.toBeInTheDocument()
  })

  test('opens Instagram in a new tab', () => {
    renderPage(<ContactPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: '@lasce_ucr' })).toHaveAttribute('rel', 'noreferrer')
  })

  test('omits channels that are blank or still a placeholder', () => {
    renderPage(<ContactPage {...incompleteArgs} />)

    expect(screen.getByRole('link', { name: '2511-6566' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Correo electrónico' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fax' })).not.toBeInTheDocument()
    expect(screen.queryByText('Por definir')).not.toBeInTheDocument()
  })

  test('returns to the public landing page', () => {
    renderPage(<ContactPage {...defaultArgs} />)

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('shows the channels in English when given the English content', async () => {
    const content = getContactContent(getMessages('en'))
    renderPage(
      <ContactPage
        cards={(defaultArgs.cards ?? []).map((card) =>
          card.icon === 'phone' ? { ...card, title: 'Phone' } : card,
        )}
        content={content}
      />,
      'en',
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument()
    expect(sectionHeadings()).toEqual(['Location', 'Contact information'])
    expect(screen.getByRole('heading', { level: 3, name: 'Phone' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Location' })).toHaveTextContent(
      content.location.address,
    )
    expect(
      await screen.findByRole('region', { name: 'Location map of LASCE' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
