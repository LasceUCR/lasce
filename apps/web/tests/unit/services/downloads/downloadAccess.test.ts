import { describe, expect, test } from 'vitest'

import type { Permission } from '@/app/lib/auth/permissions'
import type { ScientificDataQuery } from '@/app/lib/scientific-data'
import { validateResourceDownload } from '@/app/services/downloads/downloadAccess'

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

describe('validateResourceDownload', () => {
  test('lets a holder of both grants proceed with GOES data, naming the instrument', () => {
    expect(
      validateResourceDownload(
        { query: exisQuery, format: 'csv', jobId: 'job-1' },
        GOES_HOLDER,
        now,
      ),
    ).toEqual({ ok: true, query: exisQuery, format: 'csv', instrument: 'EXIS', jobId: 'job-1' })
  })

  test('lets any account with download_resources proceed with a chart or ROSAC data', () => {
    expect(
      validateResourceDownload({ query: exisQuery, format: 'png' }, VISITOR, now),
    ).toMatchObject({ ok: true, instrument: 'EXIS' })
    expect(
      validateResourceDownload({ query: rosacQuery, format: 'csv' }, VISITOR, now),
    ).toMatchObject({ ok: true, instrument: 'ROSAC-I1' })
  })

  test('denies GOES data without the GOES grant and says which permission is missing', () => {
    expect(validateResourceDownload({ query: exisQuery, format: 'csv' }, VISITOR, now)).toEqual({
      ok: false,
      reason: 'forbidden',
      message: 'No tienes autorización para descargar recursos GOES.',
    })
  })

  test('denies an account whose role grants nothing', () => {
    expect(validateResourceDownload({ query: rosacQuery, format: 'png' }, [], now)).toEqual({
      ok: false,
      reason: 'forbidden',
      message: 'No tienes autorización para acceder a las descargas.',
    })
  })

  test('refuses anything from SUVI, whatever the grants', () => {
    const suviQuery = { ...exisQuery, product: 'Fe171', parameter: 'image' }

    for (const format of ['png', 'csv']) {
      expect(validateResourceDownload({ query: suviQuery, format }, GOES_HOLDER, now)).toEqual({
        ok: false,
        reason: 'unsupported',
        message: 'Este producto no ofrece descargas en el formato solicitado.',
      })
    }
  })

  test('rejects malformed requests and future GOES dates', () => {
    expect(
      validateResourceDownload({ query: exisQuery, format: 'json' }, GOES_HOLDER, now),
    ).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Seleccione un formato de descarga válido.',
    })
    expect(validateResourceDownload(null, GOES_HOLDER, now)).toMatchObject({
      ok: false,
      reason: 'invalid',
    })
    expect(
      validateResourceDownload(
        { query: { ...exisQuery, date: '2026-09-29' }, format: 'png' },
        GOES_HOLDER,
        now,
      ),
    ).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'Seleccione una fecha que no sea posterior a hoy.',
    })
  })
})
