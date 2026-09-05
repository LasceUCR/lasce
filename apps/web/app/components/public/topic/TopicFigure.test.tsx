import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { TopicFigure, type TopicFigureProps } from './TopicFigure'
import { Default } from './TopicFigure.stories'

const defaultArgs = Default.args as TopicFigureProps

describe('TopicFigure', () => {
  test('renders the image with the provided alternative text and caption', () => {
    render(<TopicFigure {...defaultArgs} />)

    expect(screen.getByRole('img', { name: defaultArgs.alt })).toHaveAttribute(
      'src',
      defaultArgs.src,
    )
    expect(screen.getByText(defaultArgs.caption ?? '')).toBeInTheDocument()
  })

  test('omits the caption when none is given', () => {
    render(<TopicFigure alt={defaultArgs.alt} src={defaultArgs.src} />)

    expect(screen.queryByText(defaultArgs.caption ?? '')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: defaultArgs.alt })).toBeInTheDocument()
  })
})
