import { createTranslator } from 'next-intl'
import { describe, expect, test, vi } from 'vitest'

import { getMessages } from './lib/i18n/messages'
import { siteUrl } from './lib/site'
import { generateMetadata } from './layout'

const request = vi.hoisted(() => ({ locale: 'es' as 'es' | 'en' }))

vi.mock('./lib/site', () => ({ siteUrl: new URL('https://lasce.example/') }))

vi.mock('next-intl/server', () => ({
  getLocale: async () => request.locale,
  getTranslations: async (namespace: 'metadata') =>
    createTranslator({
      locale: request.locale,
      messages: getMessages(request.locale),
      namespace,
    }),
}))

describe('RootLayout metadata', () => {
  test.each(['es', 'en'] as const)('provides social sharing metadata in %s', async (locale) => {
    request.locale = locale
    const messages = getMessages(locale).metadata
    const shareImage = {
      url: '/images/tools/SWAAT-sun.webp',
      width: 1536,
      height: 1024,
      alt: messages.openGraphImageAlt,
    }

    const metadata = await generateMetadata()

    expect(metadata.title).toBe(messages.title)
    expect(metadata.description).toBe(messages.description)
    expect(metadata.openGraph).toEqual({
      type: 'website',
      title: messages.title,
      description: messages.description,
      url: siteUrl.toString(),
      siteName: 'LASCE',
      locale: locale === 'es' ? 'es_CR' : 'en_US',
      images: [shareImage],
    })
    expect(metadata.twitter).toEqual({
      card: 'summary_large_image',
      title: messages.title,
      description: messages.description,
      images: [shareImage],
    })
  })
})
