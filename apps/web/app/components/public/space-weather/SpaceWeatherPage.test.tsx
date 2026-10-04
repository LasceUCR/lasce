import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { getMessages } from '@/app/lib/i18n/messages'
import {
  getSpaceWeatherContent,
  spaceWeatherBackLink,
  spaceWeatherContent,
  spaceWeatherDefinition,
  spaceWeatherHero,
} from '@/app/lib/space-weather'

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
})
