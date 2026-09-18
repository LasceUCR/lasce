import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AdminPlaceholder, type AdminPlaceholderProps } from './AdminPlaceholder'
import { Default } from './AdminPlaceholder.stories'

const defaultArgs = Default.args as AdminPlaceholderProps

describe('AdminPlaceholder', () => {
  test('shows the title, description and a coming-soon notice', () => {
    render(<AdminPlaceholder {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: defaultArgs.title })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.description)).toBeInTheDocument()
    expect(screen.getByText('Contenido en preparación')).toBeInTheDocument()
  })
})
