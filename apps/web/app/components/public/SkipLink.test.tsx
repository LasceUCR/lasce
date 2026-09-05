import { render, screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import type { Messages, NamespaceKeys, NestedKeyOf } from 'next-intl'
import { describe, expect, test, vi } from 'vitest'

import es from '@/messages/es.json'

import { SkipLink } from './SkipLink'

// `getTranslations` needs a Next.js request scope that Vitest doesn't provide,
// so it's mocked with a translator built from the real `es` catalogue. That
// keeps the assertion honest about the key actually existing rather than
// stubbing the string out entirely. `vi.mock` calls are hoisted above the
// imports above, so `SkipLink` picks up the mock when it imports
// `getTranslations` itself.
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: NamespaceKeys<Messages, NestedKeyOf<Messages>>) =>
    createTranslator({ locale: 'es', messages: es, namespace }),
}))

describe('SkipLink', () => {
  test('links keyboard focus to the shared main content landmark', async () => {
    render(await SkipLink())

    expect(screen.getByRole('link', { name: es.layout.skipToContent })).toHaveAttribute(
      'href',
      '#main-content',
    )
  })
})
