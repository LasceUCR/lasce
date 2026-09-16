import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

/** JSDOM lacks native dialog methods; browser tests verify the real lifecycle. */
export function mockDialog() {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  )
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false
      },
    })
  })
  afterEach(() => {
    cleanup()
    for (const [name, descriptor] of [
      ['showModal', originalShowModal],
      ['close', originalClose],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
    }
  })
}
