import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { SkeletonImageCard } from './SkeletonImageCard'

function shapes(container: HTMLElement) {
  return Array.from(container.firstElementChild?.querySelectorAll<HTMLElement>('span') ?? [])
}

describe('SkeletonImageCard', () => {
  test('stands in for a square image and its caption, hidden from assistive technology', () => {
    const { container } = render(<SkeletonImageCard />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    const [frame] = shapes(container)
    expect(frame).toHaveStyle({ aspectRatio: '1 / 1' })
    expect(shapes(container)).toHaveLength(3)
  })

  test('follows the proportions of the image it stands for', () => {
    const { container } = render(<SkeletonImageCard aspectRatio="16 / 9" />)

    expect(shapes(container)[0]).toHaveStyle({ aspectRatio: '16 / 9' })
  })

  test('leaves the caption out when asked', () => {
    const { container } = render(<SkeletonImageCard caption={false} />)

    expect(shapes(container)).toHaveLength(1)
  })

  test('has no text and nothing to focus', () => {
    const { container } = render(<SkeletonImageCard />)

    expect(container).toHaveTextContent('')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })
})
