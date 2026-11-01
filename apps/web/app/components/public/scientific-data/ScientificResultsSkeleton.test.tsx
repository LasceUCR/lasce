import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import {
  RESULT_IMAGE_PLACEHOLDERS,
  ScientificResultsSkeleton,
  type ScientificResultsSkeletonProps,
} from './ScientificResultsSkeleton'
import { DynamicSpectrum, SolarImages, TimeSeries } from './ScientificResultsSkeleton.stories'

function renderSkeleton(args: ScientificResultsSkeletonProps) {
  return render(<ScientificResultsSkeleton {...args} />)
}

describe('ScientificResultsSkeleton', () => {
  test('takes the shape of a time series: metadata, summary tiles and a chart', () => {
    const { container } = renderSkeleton(TimeSeries.args as ScientificResultsSkeletonProps)

    expect(container.querySelectorAll('.data-metadata > div')).toHaveLength(5)
    expect(container.querySelector('[style*="760 / 320"]')).not.toBeNull()
    expect(container.querySelector('li')).toBeNull()
  })

  test('takes the shape of a SUVI result: an image grid', () => {
    const { container } = renderSkeleton(SolarImages.args as ScientificResultsSkeletonProps)

    expect(container.querySelectorAll('li')).toHaveLength(RESULT_IMAGE_PLACEHOLDERS)
    expect(container.querySelector('[style*="760 / 320"]')).toBeNull()
  })

  test('takes the shape of a dynamic spectrum: a chart without summary tiles', () => {
    const { container } = renderSkeleton(DynamicSpectrum.args as ScientificResultsSkeletonProps)

    expect(container.querySelector('[style*="760 / 320"]')).not.toBeNull()
    expect(container.querySelector('li')).toBeNull()
  })

  test('has no text and nothing to focus', () => {
    const { container } = renderSkeleton(SolarImages.args as ScientificResultsSkeletonProps)

    expect(container).toHaveTextContent('')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })
})
