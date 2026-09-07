import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { TopicBackLink } from './TopicBackLink'

describe('TopicBackLink', () => {
  test('links back with the given label', () => {
    render(<TopicBackLink href="/#areas-de-trabajo" label="Volver a las áreas de trabajo" />)

    const link = screen.getByRole('link', { name: 'Volver a las áreas de trabajo' })

    expect(link).toHaveAttribute('href', '/#areas-de-trabajo')
  })

  test('keeps the decorative arrow out of the accessibility tree', () => {
    render(<TopicBackLink href="/#areas-de-trabajo" label="Volver a las áreas de trabajo" />)

    const link = screen.getByRole('link', { name: 'Volver a las áreas de trabajo' })

    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(link).not.toHaveAccessibleName(/←/)
  })
})
