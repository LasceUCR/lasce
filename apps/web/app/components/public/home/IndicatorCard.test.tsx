import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { IndicatorCard, type IndicatorCardProps } from './IndicatorCard'
import { Default } from './IndicatorCard.stories'

const args = Default.args as IndicatorCardProps

describe('IndicatorCard', () => {
  test('shows the index name above its value and description', () => {
    render(<IndicatorCard {...args} />)

    expect(screen.getByText('Índice Dst')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('-12 nT · Estable')
  })

  test('marks the language of the description only', () => {
    render(<IndicatorCard {...args} descriptionLang="en" description="Stable" />)

    expect(screen.getByText('Stable')).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Índice Dst')).not.toHaveAttribute('lang')
  })
})
