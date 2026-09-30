import { describe, expect, test, vi } from 'vitest'

import { scrollIntoViewIfSupported } from './scrollIntoView'

describe('scrollIntoViewIfSupported', () => {
  test('calls scrollIntoView, centered and smooth, when the element supports it', () => {
    const scrollIntoView = vi.fn()
    const element = { scrollIntoView } as unknown as HTMLElement

    scrollIntoViewIfSupported(element)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  test('does nothing when the element has no scrollIntoView method, e.g. jsdom', () => {
    const element = {} as unknown as HTMLElement

    expect(() => scrollIntoViewIfSupported(element)).not.toThrow()
  })

  test('does nothing when the element is null', () => {
    expect(() => scrollIntoViewIfSupported(null)).not.toThrow()
  })
})
