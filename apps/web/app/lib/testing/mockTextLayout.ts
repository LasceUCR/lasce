import { vi } from 'vitest'

const LINE_HEIGHT = 20
const CHARS_PER_LINE = 40

/**
 * jsdom lays nothing out, so a component that measures text (`TruncatedText`) has to be told how
 * tall it is. With `overflows` every line holds 40 characters and is 20px tall, so a long text
 * runs past any small number of lines and a cut can be found; without it the text is one line
 * tall and always fits. Restore with `vi.restoreAllMocks()` and `vi.unstubAllGlobals()`.
 */
export function mockTextLayout(overflows: boolean) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        this.callback()
      }
      disconnect() {}
    },
  )
  const realGetComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = realGetComputedStyle(element, pseudo)
    // Only the measuring probe gets a line height; accessibility queries need the real thing.
    if (!element.classList?.contains('truncated-text-probe')) return style
    return new Proxy(style, {
      get: (target, key) =>
        key === 'lineHeight'
          ? `${LINE_HEIGHT}px`
          : key === 'fontSize'
            ? '16px'
            : (Reflect.get(target, key).bind?.(target) ?? Reflect.get(target, key)),
    })
  })
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!overflows) return LINE_HEIGHT
    return Math.ceil((this.textContent?.length ?? 0) / CHARS_PER_LINE) * LINE_HEIGHT
  })
}
