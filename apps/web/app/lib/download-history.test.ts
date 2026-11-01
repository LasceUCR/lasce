import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  downloadFindMany: vi.fn(),
  userFindMany: vi.fn(),
  userHasPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: {
    resourceDownload: { count: mocks.count, findMany: mocks.downloadFindMany },
    user: { findMany: mocks.userFindMany },
  },
}))
vi.mock('./auth/authorization', () => ({ userHasPermission: mocks.userHasPermission }))

import {
  DOWNLOAD_HISTORY_PAGE_SIZE,
  getDownloadHistoryPage,
  normalizeDownloadHistoryFilters,
} from './download-history'

const userId = '0a7d5a3e-5a0c-4a55-8a53-4f6b1c0f7a11'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    source: 'GOES',
    instrument: 'EXIS',
    product: 'EXIS-L1b-SFXR',
    format: 'csv',
    params: { parameter: 'xrsa', date: '2026-10-15', startTime: '00:00', endTime: '23:59' },
    createdAt: new Date('2026-10-16T18:00:00.000Z'),
    user: { fullName: 'Ana' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.userHasPermission.mockResolvedValue(true)
  mocks.count.mockResolvedValue(0)
  mocks.userFindMany.mockResolvedValue([])
  mocks.downloadFindMany.mockResolvedValue([])
})

describe('getDownloadHistoryPage', () => {
  test('refuses an account without the grant and reads nothing', async () => {
    mocks.userHasPermission.mockResolvedValue(false)

    await expect(getDownloadHistoryPage(1)).rejects.toThrow('Unauthorized')
    expect(mocks.userHasPermission).toHaveBeenCalledWith('view_download_history')
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.downloadFindMany).not.toHaveBeenCalled()
  })

  test('fetches only the 10 newest downloads of the page asked for', async () => {
    mocks.count.mockResolvedValue(25)

    const history = await getDownloadHistoryPage(3)

    expect(DOWNLOAD_HISTORY_PAGE_SIZE).toBe(10)
    expect(history).toMatchObject({ page: 3, totalPages: 3, totalItems: 25 })
    expect(mocks.downloadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
      }),
    )
  })

  test('brings a page past the end back to the last page', async () => {
    mocks.count.mockResolvedValue(25)

    const history = await getDownloadHistoryPage(7)

    expect(history.page).toBe(3)
    expect(mocks.downloadFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20 }))
  })

  test('never selects the object key or any link', async () => {
    await getDownloadHistoryPage(1)

    const { select } = mocks.downloadFindMany.mock.calls[0]![0] as { select: object }
    expect(Object.keys(select)).not.toContain('objectKey')
    expect(Object.keys(select)).not.toContain('expiresAt')
  })

  test('applies the filters to the count and to the rows, in UTC', async () => {
    await getDownloadHistoryPage(1, {
      from: '2026-10-01',
      to: '2026-10-31',
      source: 'GOES',
      instrument: 'EXIS',
      format: 'csv',
      user: userId,
    })

    const where = {
      createdAt: {
        gte: new Date('2026-10-01T00:00:00Z'),
        lt: new Date('2026-11-01T00:00:00Z'),
      },
      source: 'GOES',
      instrument: 'EXIS',
      format: 'csv',
      userId,
    }
    expect(mocks.count).toHaveBeenCalledWith({ where })
    expect(mocks.downloadFindMany).toHaveBeenCalledWith(expect.objectContaining({ where }))
  })

  test('maps rows, reading the queried range and naming a deleted account as null', async () => {
    mocks.count.mockResolvedValue(2)
    mocks.downloadFindMany.mockResolvedValue([row(), row({ id: 'd2', user: null, params: null })])

    const { items } = await getDownloadHistoryPage(1)

    expect(items[0]).toMatchObject({
      userName: 'Ana',
      date: '2026-10-15',
      startTime: '00:00',
      endTime: '23:59',
      downloadedAt: '2026-10-16T18:00:00.000Z',
    })
    expect(items[1]).toMatchObject({ userName: null, date: '', startTime: '', endTime: '' })
  })

  test('offers the people who downloaded something as a filter', async () => {
    mocks.userFindMany.mockResolvedValue([{ id: userId, fullName: 'Ana' }])

    const { options } = await getDownloadHistoryPage(1)

    expect(options.users).toEqual([{ id: userId, name: 'Ana' }])
    expect(options.formats).toEqual(['png', 'csv'])
  })
})

describe('normalizeDownloadHistoryFilters', () => {
  test('drops values that are not valid instead of failing', () => {
    expect(
      normalizeDownloadHistoryFilters({
        from: '15/10/2026',
        to: '2026-02-31',
        source: 'NOPE',
        instrument: "EXIS'; --",
        format: 'pdf',
        user: 'not-a-uuid',
      }),
    ).toEqual({ from: '', to: '', source: '', instrument: '', format: '', user: '' })
  })
})
