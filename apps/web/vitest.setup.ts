import { createElement } from 'react'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import '@testing-library/jest-dom/vitest'

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string
    src: string
    className?: string
  }) => createElement('img', { alt, className, src }),
}))

afterEach(() => {
  cleanup()
})
