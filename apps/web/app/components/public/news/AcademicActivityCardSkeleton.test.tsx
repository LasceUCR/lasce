import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { AcademicActivitiesListSkeleton } from './AcademicActivitiesListSkeleton'
import { AcademicActivityCardSkeleton } from './AcademicActivityCardSkeleton'

describe('AcademicActivityCardSkeleton', () => {
  test('is hidden from assistive technologies and contains no focusable elements', () => {
    const { container } = render(<AcademicActivityCardSkeleton />)

    const article = container.querySelector('article')
    expect(article).toHaveAttribute('aria-hidden', 'true')

    const focusable = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    expect(focusable).toHaveLength(0)
  })

  test('uses the news-card and academic-activity-card layout classes', () => {
    const { container } = render(<AcademicActivityCardSkeleton />)

    const article = container.querySelector('article')
    expect(article).toHaveClass('surface-card', 'news-card', 'academic-activity-card')
    expect(container.querySelector('.news-card-image')).toBeInTheDocument()
    expect(container.querySelector('.news-card-content')).toBeInTheDocument()
  })

  test('renders image and content placeholders', () => {
    const { container } = render(<AcademicActivityCardSkeleton />)

    expect(container.querySelector('.academic-activity-card-header')).toBeInTheDocument()
    expect(container.querySelector('.academic-activity-card-description')).toBeInTheDocument()
  })
})

describe('AcademicActivitiesListSkeleton', () => {
  test('renders the requested count of card skeletons inside the list container', () => {
    const { container } = render(<AcademicActivitiesListSkeleton count={4} />)

    const list = container.querySelector('.academic-activities-list')
    expect(list).toBeInTheDocument()
    expect(container.querySelectorAll('.academic-activity-card')).toHaveLength(4)
  })

  test('applies standalone and page-width classes when standalone is true', () => {
    const { container } = render(<AcademicActivitiesListSkeleton standalone />)

    const list = container.querySelector('.academic-activities-list')
    expect(list).toHaveClass('academic-activities-list-standalone', 'page-width')
  })
})
