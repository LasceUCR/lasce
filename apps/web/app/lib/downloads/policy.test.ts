import { describe, expect, test } from 'vitest'

import type { Permission } from '@/app/lib/auth/permissions'
import type { ScientificProductCode, ScientificSourceCode } from '@/app/lib/scientific-data'

import { isDownloadFormat, type DownloadFormat } from './formats'
import { decideDownload, getDownloadOptions } from './policy'

const VISITOR: Permission[] = ['download_resources']
const GOES_HOLDER: Permission[] = ['download_resources', 'download_goes_resources']

function target(source: ScientificSourceCode, product: ScientificProductCode) {
  return { source, product }
}

describe('decideDownload', () => {
  test.each<[ScientificSourceCode, ScientificProductCode, DownloadFormat, Permission[], string]>([
    ['GOES', 'SFXR', 'png', VISITOR, 'allowed'],
    ['GOES', 'SFXR', 'csv', VISITOR, 'forbidden'],
    ['GOES', 'SFXR', 'csv', GOES_HOLDER, 'allowed'],
    ['GOES', 'SFEU', 'csv', GOES_HOLDER, 'allowed'],
    ['GOES', 'GEOF', 'png', VISITOR, 'allowed'],
    ['GOES', 'GEOF', 'csv', GOES_HOLDER, 'unsupported'],
    ['GOES', 'MPSH', 'png', VISITOR, 'allowed'],
    ['GOES', 'SGPS', 'csv', GOES_HOLDER, 'unsupported'],
    ['GOES', 'Fe171', 'png', GOES_HOLDER, 'unsupported'],
    ['GOES', 'Fe171', 'csv', GOES_HOLDER, 'unsupported'],
    ['ROSAC', 'ROSAC-I1', 'csv', VISITOR, 'allowed'],
    ['ROSAC', 'ROSAC-I2', 'png', VISITOR, 'allowed'],
    ['ROSAC', 'ROSAC-I2', 'csv', [], 'forbidden'],
  ])('%s %s as %s with grants %j is %s', (source, product, format, grants, status) => {
    expect(decideDownload(target(source, product), format, grants).status).toBe(status)
  })

  test('names every grant a refused download is missing', () => {
    expect(decideDownload(target('GOES', 'SFXR'), 'csv', [])).toEqual({
      status: 'forbidden',
      instrument: 'EXIS',
      missing: ['download_resources', 'download_goes_resources'],
    })
  })

  test('refuses a product that is not in the catalogue for its source', () => {
    expect(decideDownload(target('ROSAC', 'SFXR'), 'png', GOES_HOLDER)).toEqual({
      status: 'unsupported',
    })
  })
})

describe('getDownloadOptions', () => {
  test('lists the formats in a fixed order, marking the ones the grants do not cover', () => {
    expect(getDownloadOptions(target('GOES', 'SFXR'), VISITOR)).toEqual([
      { format: 'png', label: 'Descargar gráfica (PNG)', kind: 'graphic', allowed: true },
      { format: 'csv', label: 'Descargar datos (CSV)', kind: 'data', allowed: false },
    ])
  })

  test('offers only the image for instruments without a data export', () => {
    expect(getDownloadOptions(target('GOES', 'GEOF'), GOES_HOLDER).map((o) => o.format)).toEqual([
      'png',
    ])
  })

  test('offers nothing for SUVI', () => {
    expect(getDownloadOptions(target('GOES', 'He303'), GOES_HOLDER)).toEqual([])
  })
})

describe('isDownloadFormat', () => {
  test('accepts only the catalogued formats', () => {
    expect(isDownloadFormat('png')).toBe(true)
    expect(isDownloadFormat('csv')).toBe(true)
    expect(isDownloadFormat('json')).toBe(false)
    expect(isDownloadFormat(undefined)).toBe(false)
  })
})
