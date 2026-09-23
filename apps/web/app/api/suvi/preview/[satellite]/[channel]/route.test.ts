import { describe, expect, test, vi } from 'vitest'

// An invalid param must be rejected before a `Minio.Client` is ever constructed, so `minio`
// is mocked with a class that would throw if actually instantiated or used — proving the 400
// path never gets there.
vi.mock('minio', () => ({
  Client: class {
    constructor() {
      throw new Error('Minio.Client should not be constructed for an invalid param')
    }
  },
}))

import { GET } from './route'

function paramsOf(satellite: string, channel: string) {
  return Promise.resolve({ satellite, channel })
}

describe('GET /api/suvi/preview/[satellite]/[channel]', () => {
  test('rejects a satellite with characters outside [a-z0-9-]', async () => {
    const response = await GET(new Request('http://localhost/api/suvi/preview/G19/fe093'), {
      params: paramsOf('G19', 'fe093'),
    })

    expect(response.status).toBe(400)
  })

  test('rejects a channel with characters outside [a-z0-9-]', async () => {
    const response = await GET(new Request('http://localhost/api/suvi/preview/g19/Fe093'), {
      params: paramsOf('g19', 'Fe093'),
    })

    expect(response.status).toBe(400)
  })
})
