import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  queryInfluxSql: vi.fn(),
  queryCiticScientificData: vi.fn(),
  bucketExists: vi.fn(),
  putObject: vi.fn(),
  presignedGetObject: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: { resourceDownload: { create: mocks.create } } }))
vi.mock('@lasce/config/env', () => ({
  serverEnv: () => ({
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_USE_SSL: false,
    MINIO_DOWNLOADS_BUCKET: 'lasce-downloads',
  }),
}))
vi.mock('minio', () => ({
  Client: class {
    bucketExists = mocks.bucketExists
    makeBucket = vi.fn()
    setBucketLifecycle = vi.fn()
    putObject = mocks.putObject
    presignedGetObject = mocks.presignedGetObject
  },
}))
vi.mock('@resvg/resvg-js', () => ({
  Resvg: class {
    render() {
      return { asPng: () => Buffer.from('png') }
    }
  },
}))
vi.mock('@/app/services/scientific-data/influxSql', () => ({
  queryInfluxSql: mocks.queryInfluxSql,
}))
vi.mock('@/app/services/scientific-data/citicScientificDataSource', () => ({
  queryCiticScientificData: mocks.queryCiticScientificData,
}))

import type { Permission } from '@/app/lib/auth/permissions'
import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { resetDownloadStorage } from '@/app/services/downloads/downloadStorage'
import { createResourceDownload, downloadFilename } from '@/app/services/downloads/downloadService'
import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

const now = new Date('2026-09-28T12:00:00Z')
const VISITOR: Permission[] = ['download_resources']
const GOES_HOLDER: Permission[] = ['download_resources', 'download_goes_resources']

const exisQuery: ScientificDataQuery = {
  source: 'GOES',
  product: 'SFXR',
  parameter: '0.1-0.8nm',
  date: '2026-09-27',
  startTime: '08:00',
  endTime: '09:00',
}
const rosacQuery: ScientificDataQuery = {
  source: 'ROSAC',
  product: 'ROSAC-I1',
  parameter: 'simulated-intensity',
  date: '2026-09-27',
  startTime: '08:00',
  endTime: '09:00',
}
const magQuery: ScientificDataQuery = { ...exisQuery, product: 'GEOF', parameter: 'total' }
const suviQuery: ScientificDataQuery = { ...exisQuery, product: 'Fe171', parameter: 'image' }

function download(request: unknown, grants: Permission[] = GOES_HOLDER) {
  return createResourceDownload({ userId: 'user-1', grants, request, now })
}

beforeEach(() => {
  resetDownloadStorage()
  mocks.bucketExists.mockResolvedValue(true)
  mocks.presignedGetObject.mockResolvedValue('http://localhost:9000/signed')
  mocks.create.mockResolvedValue({})
  mocks.queryInfluxSql.mockResolvedValue([
    { time: '2026-09-27T08:00:00', value: 1e-7, satellite: 'G19', n: 0 },
    { time: '2026-09-27T08:00:01', value: 2e-7, satellite: 'G19', n: 0 },
  ])
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('createResourceDownload', () => {
  test('exports full-resolution EXIS data, stores it and records the download', async () => {
    const result = await download({ query: exisQuery, format: 'csv' })

    expect(result).toEqual({
      ok: true,
      url: 'http://localhost:9000/signed',
      filename: 'GOES_EXIS_SFXR_0.1-0.8nm_2026-09-27_0800-0900.csv',
      expiresAt: '2026-09-28T12:30:00.000Z',
    })
    const [sql] = mocks.queryInfluxSql.mock.calls[0]!
    expect(sql).not.toContain('ROW_NUMBER')
    const [, objectKey, body] = mocks.putObject.mock.calls[0]!
    expect(objectKey).toMatch(/^GOES\/EXIS\/2026-09-28\/[0-9a-f-]{36}\.csv$/)
    expect(body.toString('utf8')).toContain('2026-09-27T08:00:01Z,2e-7')
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        source: 'GOES',
        instrument: 'EXIS',
        product: 'SFXR',
        format: 'csv',
        params: {
          parameter: '0.1-0.8nm',
          date: '2026-09-27',
          startTime: '08:00',
          endTime: '09:00',
        },
        objectKey,
        byteSize: body.length,
        rowCount: 2,
        expiresAt: new Date('2026-09-28T12:30:00.000Z'),
      },
    })
  })

  test('refuses GOES data without the GOES data grant, before reading anything', async () => {
    const result = await download({ query: exisQuery, format: 'csv' }, VISITOR)

    expect(result).toEqual({
      ok: false,
      reason: 'forbidden',
      message: 'No tienes autorización para descargar recursos GOES.',
    })
    expect(mocks.queryInfluxSql).not.toHaveBeenCalled()
    expect(mocks.putObject).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  test('lets any account export ROSAC data', async () => {
    const result = await download({ query: rosacQuery, format: 'csv' }, VISITOR)

    expect(result).toMatchObject({ ok: true })
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'ROSAC', instrument: 'ROSAC-I1', format: 'csv' }),
    })
  })

  test('renders a chart image with no row count', async () => {
    const result = await download({ query: rosacQuery, format: 'png' }, VISITOR)

    expect(result).toMatchObject({
      ok: true,
      filename: 'ROSAC_ROSAC-I1_ROSAC-I1_simulated-intensity_2026-09-27_0800-0900.png',
    })
    expect(mocks.putObject.mock.calls[0]![4]).toEqual({ 'Content-Type': 'image/png' })
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ format: 'png', rowCount: null }),
    })
  })

  test('refuses everything from SUVI', async () => {
    for (const format of ['png', 'csv']) {
      expect(await download({ query: suviQuery, format })).toMatchObject({
        ok: false,
        reason: 'unsupported',
      })
    }
    expect(mocks.putObject).not.toHaveBeenCalled()
  })

  test('refuses MAG data, which has no full-resolution export yet', async () => {
    expect(await download({ query: magQuery, format: 'csv' })).toMatchObject({
      ok: false,
      reason: 'unsupported',
    })
  })

  test('asks to wait while an asynchronous query is still running', async () => {
    mocks.queryCiticScientificData.mockResolvedValue({ state: 'pending', jobId: 'j', progress: 10 })

    const result = await download({ query: magQuery, format: 'png', jobId: 'j' }, VISITOR)

    expect(mocks.queryCiticScientificData).toHaveBeenCalledWith(magQuery, 'j')
    expect(result).toMatchObject({ ok: false, reason: 'pending' })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  test('has nothing to download for an empty window', async () => {
    mocks.queryInfluxSql.mockResolvedValue([])

    expect(await download({ query: exisQuery, format: 'png' })).toEqual({
      ok: false,
      reason: 'empty',
      message: 'No hay datos para descargar con los criterios seleccionados.',
    })
  })

  test('rejects malformed requests and future GOES dates', async () => {
    expect(await download({ query: exisQuery, format: 'json' })).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Seleccione un formato de descarga válido.',
    })
    expect(await download({ query: { ...exisQuery, startTime: '10:00' }, format: 'png' })).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'La hora de inicio debe ser anterior a la hora de fin.',
    })
    expect(await download({ query: { ...exisQuery, date: '2026-09-29' }, format: 'png' })).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Seleccione una fecha que no sea posterior a hoy.',
    })
  })

  test('writes no record when the file never reached storage', async () => {
    mocks.putObject.mockRejectedValue(new Error('storage offline'))

    await expect(download({ query: exisQuery, format: 'csv' })).rejects.toThrow('storage offline')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  test('hands out no link when the record cannot be written', async () => {
    mocks.create.mockRejectedValue(new Error('database offline'))

    await expect(download({ query: exisQuery, format: 'csv' })).rejects.toThrow('database offline')
  })

  test('lets upstream failures reach the caller', async () => {
    mocks.queryInfluxSql.mockRejectedValue(new ScientificDataUpstreamError('down'))

    await expect(download({ query: exisQuery, format: 'csv' })).rejects.toBeInstanceOf(
      ScientificDataUpstreamError,
    )
  })
})

describe('downloadFilename', () => {
  test('keeps only characters that are safe in a header', () => {
    expect(downloadFilename({ ...exisQuery, parameter: 'electron:T1:E1' }, 'SEISS', 'png')).toBe(
      'GOES_SEISS_SFXR_electron-T1-E1_2026-09-27_0800-0900.png',
    )
  })
})
