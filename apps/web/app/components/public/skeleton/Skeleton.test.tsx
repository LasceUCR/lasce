import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { Skeleton, SkeletonText, type SkeletonProps } from './Skeleton'
import { Block, Circle, Dark, Paragraph, SquareImage, TextLine } from './Skeleton.stories'

function placeholdersIn(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'))
}

describe('Skeleton', () => {
  test.each([
    ['a block', Block.args],
    ['a line of text', TextLine.args],
    ['a circle', Circle.args],
    ['a dark square', Dark.args],
  ])('draws %s that assistive technology does not see', (_name, args) => {
    const { container } = render(
      <section aria-label="Resultados">
        <Skeleton {...(args as SkeletonProps)} />
      </section>,
    )

    const [placeholder] = placeholdersIn(container)
    expect(placeholder).toBeDefined()
    expect(placeholder).not.toHaveAttribute('role')
    expect(screen.getByRole('region', { name: 'Resultados' })).toHaveTextContent('')
  })

  test('cannot take keyboard focus', async () => {
    const user = userEvent.setup()
    render(<Skeleton {...(Block.args as SkeletonProps)} />)

    await user.tab()

    expect(document.body).toHaveFocus()
  })

  test('takes the size it is given, numbers as pixels', () => {
    const { container } = render(<Skeleton height="40px" width={120} />)

    expect(placeholdersIn(container)[0]).toHaveStyle({ width: '120px', height: '40px' })
  })

  test('sizes itself by its proportions when given an aspect ratio', () => {
    const { container } = render(<Skeleton {...(SquareImage.args as SkeletonProps)} height={10} />)

    expect(placeholdersIn(container)[0]).toHaveStyle({
      aspectRatio: '1 / 1',
      height: 'auto',
      width: '200px',
    })
  })
})

describe('SkeletonText', () => {
  test('draws one line per line of text, the last one shorter', () => {
    const { container } = render(<SkeletonText {...Paragraph.args} />)

    const lines = placeholdersIn(container).slice(1)
    expect(lines).toHaveLength(4)
    expect(lines.at(-1)).toHaveStyle({ width: '60%' })
    expect(lines[0]).not.toHaveStyle({ width: '60%' })
  })

  test('draws at least one full line', () => {
    const { container } = render(<SkeletonText lines={0} />)

    const lines = placeholdersIn(container).slice(1)
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toHaveStyle({ width: '60%' })
  })

  test('is hidden from assistive technology as a whole', () => {
    const { container } = render(<SkeletonText lines={2} />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
