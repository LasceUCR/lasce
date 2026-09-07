import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import {
  spaceWeatherBackLink,
  spaceWeatherDefinition,
  spaceWeatherHero,
} from '@/app/lib/space-weather'

import { SpaceWeatherPage } from './SpaceWeatherPage'

describe('SpaceWeatherPage', () => {
  test('introduces space weather without the LASCE work section', () => {
    render(<SpaceWeatherPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: spaceWeatherHero.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Qué es el clima espacial/ })).toBeInTheDocument()
    expect(screen.getByText(spaceWeatherDefinition.paragraphs[0] ?? '')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Del Sol a la Tierra/ })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Por qué estudiarlo desde Costa Rica/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Qué compone el clima espacial/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /El trabajo de LASCE/ })).not.toBeInTheDocument()
  })

  test('explains the solar chain and links back to the work areas', () => {
    render(<SpaceWeatherPage />)

    expect(screen.getByRole('heading', { name: '1. El Sol libera energía' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Actividad solar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: spaceWeatherBackLink.label })).toHaveAttribute(
      'href',
      spaceWeatherBackLink.href,
    )
  })
})
