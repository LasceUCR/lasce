import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { InfoCard, type InfoCardProps } from './InfoCard'
import { Default, WithMoreInformation } from './InfoCard.stories'

const defaultArgs = Default.args as InfoCardProps
const moreArgs = WithMoreInformation.args as InfoCardProps

describe('InfoCard', () => {
  test('shows the title and description it was given', () => {
    render(<InfoCard {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 3, name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.description)).toBeInTheDocument()
    expect(screen.queryByText('Más información')).not.toBeInTheDocument()
  })

  test('keeps the decorative icon out of the accessibility tree', () => {
    const { container } = render(<InfoCard {...defaultArgs} />)

    expect(container.querySelector('.info-card-icon')).toHaveAttribute('aria-hidden', 'true')
  })

  test('hides extra detail until the visitor opens it', async () => {
    const user = userEvent.setup()
    const { container } = render(<InfoCard {...moreArgs} />)
    const details = container.querySelector('details')

    expect(details).not.toHaveAttribute('open')

    await user.click(screen.getByText('Más información'))

    expect(details).toHaveAttribute('open')
    expect(screen.getByText(moreArgs.more ?? '')).toBeInTheDocument()
  })
})
