import type { Messages } from 'next-intl'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

import { defaultLocale, type Locale } from './config'

interface MessageTree {
  [key: string]: string | MessageTree
}

// Static imports rather than `import(`@/messages/${locale}.json`)`: with `output: 'standalone'`
// the file tracer has to see every catalogue, and a path built at runtime is invisible to it.
const translations: Record<Exclude<Locale, typeof defaultLocale>, MessageTree> = { en }

/**
 * Lays `overrides` over `base`, key by key. A key that `overrides` lacks keeps the `base` text,
 * and a key that `base` lacks is dropped, so the result always has exactly the shape of `base`.
 */
export function mergeMessages(base: MessageTree, overrides: MessageTree): MessageTree {
  const merged: MessageTree = { ...base }

  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = base[key]

    if (typeof baseValue === 'string' && typeof value === 'string') {
      merged[key] = value
    } else if (typeof baseValue === 'object' && typeof value === 'object') {
      merged[key] = mergeMessages(baseValue, value)
    }
  }

  return merged
}

/**
 * The catalogue for `locale`. A message not translated yet falls back to Spanish, so a
 * partially translated language renders Spanish text in the gaps instead of a key path.
 */
export function getMessages(locale: Locale): Messages {
  if (locale === defaultLocale) return es

  return mergeMessages(es, translations[locale]) as Messages
}
