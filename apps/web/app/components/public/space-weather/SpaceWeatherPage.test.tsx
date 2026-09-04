import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import {
  spaceWeatherBackLink,
  spaceWeatherContentFlag,
  spaceWeatherHero,
  spaceWeatherImpacts,
  spaceWeatherLasce,
} from '@/app/lib/space-weather'

import { SpaceWeatherPage } from './SpaceWeatherPage'

describe('SpaceWeatherPage', () => {
  test('introduces space weather, solar activity and LASCE work without authentication chrome', () => {
    render(<SpaceWeatherPage />)

    expect(
      screen.getByRole('complementary', { name: spaceWeatherContentFlag.label }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: spaceWeatherHero.title })).toBeInTheDocument()
    expect(screen.getByText(spaceWeatherHero.introduction)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Qué compone el clima espacial/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /El Sol y el clima espacial/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Impactos en la Tierra/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: spaceWeatherLasce.title })).toBeInTheDocument()
  })

  test('explains the solar chain and links back to the work areas', () => {
    render(<SpaceWeatherPage />)

    expect(screen.getByRole('heading', { name: 'Actividad solar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Manchas solares' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: spaceWeatherImpacts.items[0]?.title })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Fulguración solar/ })).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: spaceWeatherBackLink.label })).toHaveAttribute(
      'href',
      spaceWeatherBackLink.href,
    )
  })
})
