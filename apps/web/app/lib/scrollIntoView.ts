/**
 * `scrollIntoView` guarded for environments that don't implement it (jsdom,
 * notably, which every component test runs under) — calling it unguarded
 * throws `TypeError: ...scrollIntoView is not a function` there.
 */
export function scrollIntoViewIfSupported(element: HTMLElement | null): void {
  if (typeof element?.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
