import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SkeletonChart } from './SkeletonChart'
import { ChartOnly } from './SkeletonChart.stories'

/** The direct children of the summary row, one per tile. */
function tiles(container: HTMLElement) {
  const root = container.firstElementChild
  const hasSummary = (root?.children.length ?? 0) > 1
  return hasSummary ? Array.from(root!.firstElementChild!.children) : []
}

describe('SkeletonChart', () => {
  test('stands in for three summary tiles and the chart, hidden from assistive technology', () => {
    const { container } = render(<SkeletonChart />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(tiles(container)).toHaveLength(3)
    expect(container.querySelector('[style*="aspect-ratio"]')).toHaveStyle({
      aspectRatio: '760 / 320',
    })
  })

  test('draws as many summary tiles as the result will have', () => {
    const { container } = render(<SkeletonChart summaryTiles={2} />)

    expect(tiles(container)).toHaveLength(2)
  })

  test('draws only the chart when the result has no summary', () => {
    const { container } = render(<SkeletonChart {...ChartOnly.args} />)

    expect(tiles(container)).toHaveLength(0)
    expect(container.querySelector('[style*="aspect-ratio"]')).not.toBeNull()
  })

  test('has no text and nothing to focus', () => {
    const { container } = render(<SkeletonChart />)

    expect(container).toHaveTextContent('')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })
})
