import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AccessDenied, type AccessDeniedProps } from './AccessDenied'
import { Default } from './AccessDenied.stories'

const defaultArgs = Default.args as AccessDeniedProps

describe('AccessDenied', () => {
  test('explains that the signed-in user cannot use the protected function', () => {
    render(<AccessDenied {...defaultArgs} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.getByText(defaultArgs.message)).toBeInTheDocument()
  })
})
