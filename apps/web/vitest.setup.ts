import { createElement } from 'react'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import '@testing-library/jest-dom/vitest'

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
    onError,
  }: {
    alt: string
    src: string
    className?: string
    onError?: () => void
  }) => createElement('img', { alt, className, src, onError }),
}))

afterEach(() => {
  cleanup()
})
