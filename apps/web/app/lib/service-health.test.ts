import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  clientOptions: vi.fn(),
  bucketExists: vi.fn(),
  clientList: vi.fn(),
}))

vi.mock('@lasce/config/env', () => ({ serverEnv: () => mocks.env }))

vi.mock('@lasce/jobs', () => ({
  getQueue: () => ({ qualifiedName: 'bull:lasce' }),
  getRedisConnection: () => ({ client: mocks.clientList }),
}))

vi.mock('minio', () => ({
  Client: class {
    constructor(options: unknown) {
      mocks.clientOptions(options)
    }
    bucketExists = mocks.bucketExists
  },
}))

import {
  PROBE_TIMEOUT_MS,
  checkInflux,
  checkMinio,
  checkServices,
  checkWorkers,
  probe,
  workerConnections,
} from './service-health'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  mocks.env = {
    MINIO_ENDPOINT: 'minio:9000',
    MINIO_USE_SSL: false,
    MINIO_BUCKET: 'lasce-files',
    MINIO_ACCESS_KEY: 'key',
    MINIO_SECRET_KEY: 'secret',
    INFLUXDB_HOST: 'http://influx:8181',
    INFLUXDB_TOKEN: 'token',
  }
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('probe', () => {
  test('is ok when the check finds nothing wrong', async () => {
    await expect(probe(async () => null)).resolves.toEqual({ state: 'ok' })
  })

  test('is down with the reason the check returns', async () => {
    await expect(probe(async () => 'no worker')).resolves.toEqual({
      state: 'down',
      reason: 'no worker',
    })
  })

  test('is down with the error message when the check throws', async () => {
    await expect(
      probe(async () => {
        throw new Error('connect ECONNREFUSED')
      }),
    ).resolves.toEqual({ state: 'down', reason: 'connect ECONNREFUSED' })
  })

  test('is down when the check throws something that is not an error', async () => {
    await expect(probe(() => Promise.reject('nope'))).resolves.toEqual({
      state: 'down',
      reason: 'unreachable',
    })
  })

  test('is down when the check never settles', async () => {
    vi.useFakeTimers()
    const result = probe(() => new Promise<never>(() => {}))

    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS)

    await expect(result).resolves.toEqual({
      state: 'down',
      reason: `timed out after ${PROBE_TIMEOUT_MS}ms`,
    })
  })
})

describe('checkMinio', () => {
  test('passes when the bucket exists, connecting with the parsed endpoint', async () => {
    mocks.bucketExists.mockResolvedValue(true)

    await expect(checkMinio()).resolves.toBeNull()
    expect(mocks.clientOptions).toHaveBeenCalledWith({
      endPoint: 'minio',
      port: 9000,
      useSSL: false,
      accessKey: 'key',
      secretKey: 'secret',
    })
    expect(mocks.bucketExists).toHaveBeenCalledWith('lasce-files')
  })

  test('fails when the bucket does not exist', async () => {
    mocks.bucketExists.mockResolvedValue(false)

    await expect(checkMinio()).resolves.toBe('bucket "lasce-files" does not exist')
  })

  test('connects with empty credentials when none are configured', async () => {
    mocks.env = { ...mocks.env, MINIO_ACCESS_KEY: undefined, MINIO_SECRET_KEY: undefined }
    mocks.bucketExists.mockResolvedValue(true)

    await checkMinio()

    expect(mocks.clientOptions).toHaveBeenCalledWith(
      expect.objectContaining({ accessKey: '', secretKey: '' }),
    )
  })
})

describe('checkInflux', () => {
  test('passes when /health answers 200, sending the token', async () => {
    fetchMock.mockResolvedValue(new Response('OK', { status: 200 }))

    await expect(checkInflux()).resolves.toBeNull()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('http://influx:8181/health')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token' })
  })

  test('fails with the status when /health does not answer 200', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }))

    await expect(checkInflux()).resolves.toBe('responded with status 401')
  })

  test('sends no authorization header without a token', async () => {
    mocks.env = { ...mocks.env, INFLUXDB_TOKEN: undefined }
    fetchMock.mockResolvedValue(new Response('OK', { status: 200 }))

    await checkInflux()

    expect(fetchMock.mock.calls[0]![1]?.headers).toEqual({})
  })
})

// The shape of a real `CLIENT LIST` reply with the Python worker running: its two connections,
// plus the web's own unnamed one.
const clientList = [
  'id=26 addr=172.18.0.1:56258 fd=21 name= age=109 cmd=client|list lib-name=ioredis',
  'id=40 addr=172.18.0.1:56100 fd=22 name=bull:lasce age=48 cmd=evalsha lib-name=redis-py',
  'id=41 addr=172.18.0.1:56112 fd=23 name=bull:lasce age=48 cmd=bzpopmin lib-name=redis-py',
  '',
].join('\n')

describe('workerConnections', () => {
  test('finds the connections the Python worker names after the queue', () => {
    expect(workerConnections(clientList, 'bull:lasce')).toEqual(['bull:lasce', 'bull:lasce'])
  })

  test('finds a named worker', () => {
    expect(workerConnections('id=1 name=bull:lasce:w:ingest age=1\r\n', 'bull:lasce')).toEqual([
      'bull:lasce:w:ingest',
    ])
  })

  test('ignores connections of other queues and unnamed ones', () => {
    const others = 'id=1 name=bull:lasce-events age=1\nid=2 name=bull:other age=1\nid=3 name= age=1'

    expect(workerConnections(others, 'bull:lasce')).toEqual([])
  })
})

describe('checkWorkers', () => {
  test('passes when a worker is connected', async () => {
    mocks.clientList.mockResolvedValue(clientList)

    await expect(checkWorkers()).resolves.toBeNull()
    expect(mocks.clientList).toHaveBeenCalledWith('LIST')
  })

  test('fails when no worker is connected', async () => {
    mocks.clientList.mockResolvedValue('id=26 name= age=109\n')

    await expect(checkWorkers()).resolves.toBe('no worker is connected to the queue')
  })
})

describe('checkServices', () => {
  test('reports every service, with the API always up', async () => {
    mocks.clientList.mockResolvedValue('')
    mocks.bucketExists.mockResolvedValue(true)
    fetchMock.mockRejectedValue(new Error('fetch failed'))

    await expect(checkServices()).resolves.toEqual({
      api: { state: 'ok' },
      workers: { state: 'down', reason: 'no worker is connected to the queue' },
      minio: { state: 'ok' },
      influxdb: { state: 'down', reason: 'fetch failed' },
    })
  })
})
