import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getObject: vi.fn(),
  clientOptions: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: { suviFrame: { findUnique: mocks.findUnique } } }))

vi.mock('@lasce/config/env', () => ({
  serverEnv: () => ({
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_USE_SSL: false,
    MINIO_BUCKET: 'lasce-files',
  }),
}))

vi.mock('minio', () => ({
  Client: class {
    constructor(options: unknown) {
      mocks.clientOptions(options)
    }
    getObject = mocks.getObject
  },
}))

import { GET } from './route'

const FRAME_ID = '7f0c2a52-8a51-4c7e-9d5b-2f1a0e6b3c11'

function get(id: string) {
  return GET(new Request(`http://localhost/api/suvi/frames/${id}`), {
    params: Promise.resolve({ id }),
  })
}

async function* chunks(...parts: string[]) {
  for (const part of parts) yield Buffer.from(part)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/suvi/frames/[id]', () => {
  test('rejects an identifier that is not a UUID before reading anything', async () => {
    const response = await get('../../secrets')

    expect(response.status).toBe(400)
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.clientOptions).not.toHaveBeenCalled()
  })

  test.each([null, { previewFile: null }])(
    'answers 404 when the frame has no rendered image: %j',
    async (row) => {
      mocks.findUnique.mockResolvedValue(row)

      const response = await get(FRAME_ID)

      expect(response.status).toBe(404)
      expect(mocks.getObject).not.toHaveBeenCalled()
    },
  )

  test('streams the catalogued WebP with a one-day cache header', async () => {
    mocks.findUnique.mockResolvedValue({ previewFile: 'suvi/g19/fe171/20260910T083000.webp' })
    mocks.getObject.mockResolvedValue(chunks('RIFF', 'WEBP'))

    const response = await get(FRAME_ID)

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: FRAME_ID },
      select: { previewFile: true },
    })
    expect(mocks.getObject).toHaveBeenCalledWith(
      'lasce-files',
      'suvi/g19/fe171/20260910T083000.webp',
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/webp')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('RIFFWEBP')
  })

  test('answers 404 when the catalogued object is missing from storage', async () => {
    mocks.findUnique.mockResolvedValue({ previewFile: 'suvi/g19/fe171/20260910T083000.webp' })
    mocks.getObject.mockRejectedValue(Object.assign(new Error('gone'), { code: 'NoSuchKey' }))

    const response = await get(FRAME_ID)

    expect(response.status).toBe(404)
  })

  test('lets any other storage failure propagate', async () => {
    mocks.findUnique.mockResolvedValue({ previewFile: 'suvi/g19/fe171/20260910T083000.webp' })
    mocks.getObject.mockRejectedValue(new Error('connection reset'))

    await expect(get(FRAME_ID)).rejects.toThrow('connection reset')
  })
})
