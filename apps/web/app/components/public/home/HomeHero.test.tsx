import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { HomeHero, type HomeHeroProps } from './HomeHero'
import { English, Spanish, UnknownLanguage } from './HomeHero.stories'

const spanish = Spanish.args as HomeHeroProps

describe('HomeHero', () => {
  test('shows the title as the page heading, above the subtitle', () => {
    render(<HomeHero {...spanish} />)

    expect(screen.getByRole('heading', { level: 1, name: spanish.title })).toBeInTheDocument()
    expect(screen.getByText(spanish.lead)).toBeInTheDocument()
  })

  test('marks the language the text is in', () => {
    render(<HomeHero {...(English.args as HomeHeroProps)} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en')
  })

  test('marks text of unknown language with an empty lang', () => {
    render(<HomeHero {...(UnknownLanguage.args as HomeHeroProps)} />)

    expect(screen.getByText(spanish.lead)).toHaveAttribute('lang', '')
  })
})
