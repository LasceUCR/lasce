import { describe, expect, test } from 'vitest'

import { PAGE_SIZE, paginate, parsePageParam } from './pagination'

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
