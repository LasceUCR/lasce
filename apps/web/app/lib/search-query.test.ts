import { describe, expect, test } from 'vitest'

import { escapeLikeWildcards, parseSearchParam, SEARCH_MAX_LENGTH } from './search-query'

describe('parseSearchParam', () => {
  test('keeps the text the visitor searched for, trimmed', () => {
    expect(parseSearchParam('  radiotelescopio solar ')).toBe('radiotelescopio solar')
  })

  test('means no search when the text is absent, blank or repeated', () => {
    expect(parseSearchParam(undefined)).toBe('')
    expect(parseSearchParam('   ')).toBe('')
    expect(parseSearchParam(['sol', 'luna'])).toBe('')
  })

  test('cuts text longer than the limit', () => {
    const long = 'a'.repeat(SEARCH_MAX_LENGTH + 50)

    expect(parseSearchParam(long)).toHaveLength(SEARCH_MAX_LENGTH)
  })

  test('does not leave trailing whitespace where the text was cut', () => {
    const value = `${'a'.repeat(SEARCH_MAX_LENGTH - 1)} b`

    expect(parseSearchParam(value)).toBe('a'.repeat(SEARCH_MAX_LENGTH - 1))
  })
})

describe('escapeLikeWildcards', () => {
  test('leaves ordinary text as it is', () => {
    expect(escapeLikeWildcards('Tormenta solar 2026')).toBe('Tormenta solar 2026')
  })

  test('escapes the LIKE wildcards and the escape character', () => {
    expect(escapeLikeWildcards('100%')).toBe('100\\%')
    expect(escapeLikeWildcards('snake_case')).toBe('snake\\_case')
    expect(escapeLikeWildcards('C:\\datos')).toBe('C:\\\\datos')
  })
})
