import { describe, expect, test } from 'vitest'

import {
  isListingUrl,
  listingHref,
  PAGE_SIZE,
  pageItems,
  paginate,
  parsePageParam,
} from './pagination'

describe('parsePageParam', () => {
  test('reads a page number written in plain digits', () => {
    expect(parsePageParam('1')).toBe(1)
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam('03')).toBe(3)
  })

  test('asks for the first page when no page is given', () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam('')).toBe(1)
  })

  test('asks for the first page for a malformed, zero or negative page', () => {
    for (const value of ['abc', '2abc', '1.5', '1e3', ' 2', '+2', '-1', '-0', '0', '00']) {
      expect(parsePageParam(value), value).toBe(1)
    }
  })

  test('asks for the first page when the parameter is repeated', () => {
    expect(parsePageParam(['2', '3'])).toBe(1)
  })

  test('asks for the largest page for a number too large to represent', () => {
    expect(parsePageParam('99999999999999999999')).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('paginate', () => {
  test('uses ten items per page by default', () => {
    expect(PAGE_SIZE).toBe(10)
    expect(paginate(23, 1).pageSize).toBe(10)
  })

  test('splits 23 items into pages of 10, 10 and 3', () => {
    expect(paginate(23, 1)).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 23,
      totalPages: 3,
      skip: 0,
      take: 10,
    })
    expect(paginate(23, 2)).toMatchObject({ page: 2, skip: 10, take: 10 })
    expect(paginate(23, 3)).toMatchObject({ page: 3, skip: 20, take: 10 })
  })

  test('has exactly one page for one to ten items', () => {
    expect(paginate(1, 1).totalPages).toBe(1)
    expect(paginate(10, 1).totalPages).toBe(1)
    expect(paginate(11, 1).totalPages).toBe(2)
  })

  test('brings a page past the end down to the last page', () => {
    expect(paginate(23, 4)).toMatchObject({ page: 3, skip: 20 })
    expect(paginate(23, Number.MAX_SAFE_INTEGER)).toMatchObject({ page: 3, skip: 20 })
  })

  test('brings a page below one, or not a whole number, up to the first page', () => {
    for (const page of [0, -3, 1.5, Number.NaN]) {
      expect(paginate(23, page), String(page)).toMatchObject({ page: 1, skip: 0 })
    }
  })

  test('has no pages when there are no items, and shows the first one', () => {
    expect(paginate(0, 5)).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      skip: 0,
      take: 10,
    })
  })

  test('accepts another page size', () => {
    expect(paginate(7, 2, 5)).toMatchObject({ page: 2, totalPages: 2, skip: 5, take: 5 })
  })
})

describe('pageItems', () => {
  test('lists every page when there are seven or fewer', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 3)).toEqual([1, 2, 3])
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('lists nothing when there are no pages', () => {
    expect(pageItems(1, 0)).toEqual([])
  })

  test('leaves a gap before the last page near the start', () => {
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 12])
    expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 12])
  })

  test('leaves a gap after the first page near the end', () => {
    expect(pageItems(9, 12)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12])
    expect(pageItems(12, 12)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12])
  })

  test('shows the current page and its neighbours between two gaps in the middle', () => {
    expect(pageItems(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12])
  })

  test('always offers seven items once there are more than seven pages', () => {
    for (let current = 1; current <= 20; current += 1) {
      expect(pageItems(current, 20), String(current)).toHaveLength(7)
    }
  })
})

describe('listingHref', () => {
  test('keeps the plain URL for the first page with no search', () => {
    expect(listingHref('/noticias', {})).toBe('/noticias')
    expect(listingHref('/noticias', { query: '', page: 1 })).toBe('/noticias')
  })

  test('adds the search and the page when there are any', () => {
    expect(listingHref('/noticias', { page: 2 })).toBe('/noticias?page=2')
    expect(listingHref('/noticias', { query: 'sol' })).toBe('/noticias?q=sol')
    expect(listingHref('/noticias', { query: 'sol', page: 3 })).toBe('/noticias?q=sol&page=3')
  })

  test('encodes the search text', () => {
    expect(listingHref('/noticias', { query: 'año & más' })).toBe(
      '/noticias?q=a%C3%B1o+%26+m%C3%A1s',
    )
  })
})

describe('isListingUrl', () => {
  test('accepts a URL that says exactly what is shown', () => {
    expect(isListingUrl({}, { query: '', page: 1 })).toBe(true)
    expect(isListingUrl({ q: 'sol', page: '2' }, { query: 'sol', page: 2 })).toBe(true)
  })

  test('ignores parameters it does not own', () => {
    expect(isListingUrl({ utm_source: 'x' }, { page: 1 })).toBe(true)
  })

  test('rejects a page that was corrected', () => {
    expect(isListingUrl({ page: '0' }, { page: 1 })).toBe(false)
    expect(isListingUrl({ page: 'abc' }, { page: 1 })).toBe(false)
    expect(isListingUrl({ page: '9' }, { page: 3 })).toBe(false)
    expect(isListingUrl({ page: '02' }, { page: 2 })).toBe(false)
  })

  test('rejects a page or a search that should have been left out', () => {
    expect(isListingUrl({ page: '1' }, { page: 1 })).toBe(false)
    expect(isListingUrl({ q: '' }, { query: '' })).toBe(false)
  })

  test('rejects search text that was trimmed, and repeated parameters', () => {
    expect(isListingUrl({ q: ' sol ' }, { query: 'sol' })).toBe(false)
    expect(isListingUrl({ q: ['sol', 'luna'] }, { query: '' })).toBe(false)
    expect(isListingUrl({ page: ['2', '3'] }, { page: 1 })).toBe(false)
  })
})
