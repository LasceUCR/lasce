import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json'
import es from '@/messages/es.json'

import { getMessages, mergeMessages } from './messages'

interface MessageTree {
  [key: string]: string | MessageTree
}

/** Every message as a dotted path, for example `nav.home`. */
function keyPaths(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keyPaths(value, `${prefix}${key}.`),
  )
}

describe('message catalogues', () => {
  // Spanish is the source language. A key only another language has is a typo or a leftover:
  // nothing can render it, because `t()` is typed against the Spanish catalogue.
  test.each([['en', en]])('%s has no key that Spanish lacks', (_locale, catalogue) => {
    const source = new Set(keyPaths(es))

    expect(keyPaths(catalogue).filter((path) => !source.has(path))).toEqual([])
  })
})

describe('getMessages', () => {
  test('returns the Spanish catalogue as it is', () => {
    expect(getMessages('es')).toEqual(es)
  })

  test('returns the translation where one exists', () => {
    expect(getMessages('en').nav.home).toBe('Home')
  })

  test('has every Spanish key in every language', () => {
    expect(keyPaths(getMessages('en'))).toEqual(keyPaths(es))
  })
})

describe('mergeMessages', () => {
  const base = { nav: { home: 'Inicio', data: 'Datos' }, title: 'LASCE' }

  test('keeps the source text for a message that is not translated yet', () => {
    expect(mergeMessages(base, { nav: { home: 'Home' } })).toEqual({
      nav: { home: 'Home', data: 'Datos' },
      title: 'LASCE',
    })
  })

  test('drops a key the source catalogue lacks', () => {
    expect(mergeMessages(base, { nav: { hmoe: 'Home' }, extra: 'x' })).toEqual(base)
  })

  test('ignores a translation whose shape does not match the source', () => {
    expect(mergeMessages(base, { nav: 'Navigation', title: { text: 'LASCE' } })).toEqual(base)
  })

  test('does not modify the source catalogue', () => {
    mergeMessages(base, { nav: { home: 'Home' } })

    expect(base.nav.home).toBe('Inicio')
  })
})
