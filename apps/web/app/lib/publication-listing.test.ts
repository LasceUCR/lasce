import { describe, expect, test } from 'vitest'

import {
  isPublicationListingUrl,
  parseGroupParam,
  publicationListingHref,
} from './publication-listing'

describe('parseGroupParam', () => {
  test('accepts the two research groups', () => {
    expect(parseGroupParam('LASCE')).toBe('LASCE')
    expect(parseGroupParam('ROSAC')).toBe('ROSAC')
  })

  test('asks for every group for anything else', () => {
    for (const value of [undefined, '', 'lasce', 'otro', ['LASCE', 'ROSAC']]) {
      expect(parseGroupParam(value), String(value)).toBeNull()
    }
  })
})

describe('publicationListingHref', () => {
  test('leaves out the first page, an empty search and every group', () => {
    expect(publicationListingHref('/publicaciones', {})).toBe('/publicaciones')
    expect(publicationListingHref('/publicaciones', { group: null, page: 1, query: '' })).toBe(
      '/publicaciones',
    )
  })

  test('writes the search, the group and the page that are set', () => {
    expect(publicationListingHref('/publicaciones', { query: 'sol' })).toBe('/publicaciones?q=sol')
    expect(publicationListingHref('/publicaciones', { group: 'LASCE' })).toBe(
      '/publicaciones?group=LASCE',
    )
    expect(
      publicationListingHref('/publicaciones', { query: 'sol', group: 'ROSAC', page: 2 }),
    ).toBe('/publicaciones?q=sol&page=2&group=ROSAC')
  })
})

describe('isPublicationListingUrl', () => {
  test('accepts a URL that already says what is shown', () => {
    expect(isPublicationListingUrl({}, { query: '', page: 1, group: null })).toBe(true)
    expect(
      isPublicationListingUrl(
        { q: 'sol', page: '2', group: 'LASCE' },
        { query: 'sol', page: 2, group: 'LASCE' },
      ),
    ).toBe(true)
  })

  test('rejects a group, a page or a search the URL does not show', () => {
    expect(isPublicationListingUrl({ group: 'LASCE' }, { group: null })).toBe(false)
    expect(isPublicationListingUrl({ group: 'otro' }, { group: null })).toBe(false)
    expect(isPublicationListingUrl({}, { group: 'ROSAC' })).toBe(false)
    expect(
      isPublicationListingUrl({ page: '1', group: 'LASCE' }, { page: 1, group: 'LASCE' }),
    ).toBe(false)
  })
})
