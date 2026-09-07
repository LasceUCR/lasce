import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { CardGrid } from './CardGrid'

describe('CardGrid', () => {
  test('applies column, equal-height and tone classes', () => {
    const { container } = render(
      <CardGrid columns={3} equalHeight tone="teal">
        <article className="info-card">Una</article>
      </CardGrid>,
    )

    expect(container.firstChild).toHaveClass(
      'card-grid',
      'card-grid-3',
      'card-grid-equal',
      'card-grid-tone-teal',
    )
  })

  test('defaults to four columns without equal-height or tone modifiers', () => {
    const { container } = render(
      <CardGrid>
        <article className="info-card">Una</article>
      </CardGrid>,
    )

    expect(container.firstChild).toHaveClass('card-grid-4')
    expect(container.firstChild).not.toHaveClass('card-grid-equal')
    expect(container.firstChild).not.toHaveClass('card-grid-expandable')
  })

  test('sets a shared min height from closed cards when expandable', () => {
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        if (!(this instanceof HTMLElement)) {
          return 0
        }

        return this.classList.contains('info-card') && !this.querySelector('details')?.open ? 80 : 0
      },
    })

    try {
      const { container } = render(
        <CardGrid expandable>
          <article className="info-card">
            <p>Cerrada</p>
          </article>
          <article className="info-card">
            <details open>
              <summary>Más</summary>
            </details>
          </article>
        </CardGrid>,
      )

      expect(container.firstChild).toHaveClass('card-grid-expandable')
      expect(
        (container.firstChild as HTMLElement).style.getPropertyValue('--card-min-height'),
      ).toBe('80px')
    } finally {
      if (previous) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', previous)
      }
    }
  })
})
