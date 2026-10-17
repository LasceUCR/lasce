import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import {
  getSpaceWeatherContent,
  spaceWeatherBackLink,
  spaceWeatherContent,
  spaceWeatherDefinition,
  spaceWeatherHero,
} from '@/app/lib/space-weather'

import { bilingualSection } from './fixtures'
import { SpaceWeatherPage } from './SpaceWeatherPage'

describe('SpaceWeatherPage', () => {
  test('introduces space weather without the LASCE work section', () => {
    render(<SpaceWeatherPage content={spaceWeatherContent} />)

    expect(
      screen.getByRole('heading', { level: 1, name: spaceWeatherHero.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Qué es el clima espacial/ })).toBeInTheDocument()
    expect(screen.getByText(spaceWeatherDefinition.paragraphs[0] ?? '')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Del Sol a la Tierra/ })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Por qué estudiarlo desde Costa Rica/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Qué compone el clima espacial/ })).toHaveClass(
      'topic-section-lede',
    )
    expect(screen.queryByRole('heading', { name: /El trabajo de LASCE/ })).not.toBeInTheDocument()
  })

  test('explains the solar chain and links back to the work areas', () => {
    render(<SpaceWeatherPage content={spaceWeatherContent} />)

    expect(screen.getByRole('heading', { name: '1. El Sol libera energía' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Actividad solar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: spaceWeatherBackLink.label })).toHaveAttribute(
      'href',
      spaceWeatherBackLink.href,
    )
  })

  test('shows the page in English when given the English content', () => {
    render(<SpaceWeatherPage content={getSpaceWeatherContent(getMessages('en'))} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Space weather' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1. The Sun releases energy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Geomagnetic storms' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the work areas' })).toHaveAttribute(
      'href',
      '/#areas-de-trabajo',
    )
  })

  test('shows the stored Costa Rica card, one paragraph per block of text, in its language', () => {
    render(<SpaceWeatherPage content={spaceWeatherContent} costaRicaSection={bilingualSection} />)

    const card = screen.getByRole('region', { name: bilingualSection.title })
    for (const paragraph of bilingualSection.paragraphs) {
      expect(within(card).getByText(paragraph)).toBeInTheDocument()
    }
    expect(within(card).getByText(bilingualSection.paragraphs[0] ?? '')).toHaveAttribute(
      'lang',
      'es',
    )
    expect(within(card).getByRole('heading', { name: bilingualSection.title })).toHaveAttribute(
      'lang',
      'es',
    )
  })

  test('falls back to the catalogue text when the card is not stored', () => {
    render(<SpaceWeatherPage content={spaceWeatherContent} costaRicaSection={null} />)

    const card = screen.getByRole('region', { name: /Por qué estudiarlo desde Costa Rica/ })
    expect(within(card).getByText(/La respuesta de la ionosfera/)).not.toHaveAttribute('lang')
    expect(within(card).getByRole('heading')).not.toHaveAttribute('lang')
  })

  test('offers no editing to an account that cannot edit, even with the editing data', () => {
    render(
      <SpaceWeatherPage
        canEditCostaRica={false}
        content={spaceWeatherContent}
        costaRicaSection={bilingualSection}
      />,
    )

    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument()
  })
})
