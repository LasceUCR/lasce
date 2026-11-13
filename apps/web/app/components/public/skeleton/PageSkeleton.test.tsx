import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { renderWithIntl } from '@/app/lib/i18n/testing'

import { PageSkeleton, type PageSkeletonProps } from './PageSkeleton'
import meta, { CustomLabel, HeadingOnly } from './PageSkeleton.stories'

const args = meta.args as PageSkeletonProps

describe('PageSkeleton', () => {
  test('marks the page busy and announces that it is loading, in Spanish by default', () => {
    renderWithIntl(<PageSkeleton {...args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(screen.getByRole('status').parentElement).toHaveAttribute('aria-busy', 'true')
  })

  test('announces it in English on the English site', () => {
    renderWithIntl(<PageSkeleton {...args} />, { locale: 'en' })

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  test('announces the label it is given', () => {
    renderWithIntl(<PageSkeleton {...args} {...CustomLabel.args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando la página…')
  })

  test('shows no heading, link or control a visitor could reach while loading', () => {
    renderWithIntl(<PageSkeleton {...args} />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders with no cards for a page that is mostly text', () => {
    renderWithIntl(<PageSkeleton {...args} {...HeadingOnly.args} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
  })
})
