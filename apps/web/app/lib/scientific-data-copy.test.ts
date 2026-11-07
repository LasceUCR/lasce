import { createTranslator } from 'next-intl'
import { describe, expect, test } from 'vitest'

import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

import {
  getScientificSources,
  SCIENTIFIC_DATASETS,
  type TimeSeriesDataResult,
} from './scientific-data'
import { describeOrigin, localizeResultNames } from './scientific-data-copy'

const origins = {
  es: createTranslator({ locale: 'es', messages: es, namespace: 'scientificData.origins' }),
  en: createTranslator({ locale: 'en', messages: en, namespace: 'scientificData.origins' }),
}
const translate =
  (locale: 'es' | 'en') => (key: string, values?: Record<string, string | number>) =>
    origins[locale](key as never, values as never)

const result: TimeSeriesDataResult = {
  query: {
    source: 'GOES',
    product: 'SFXR',
    parameter: '0.1-0.8nm',
    date: '2026-09-27',
    startTime: '08:00',
    endTime: '09:00',
  },
  instrument: { code: 'EXIS', name: 'Sensores de irradiancia ultravioleta extrema y rayos X' },
  product: { code: 'SFXR', name: 'Flujo solar: rayos X' },
  parameter: { code: '0.1-0.8nm', label: 'Banda larga (0,1–0,8 nm)', unit: 'W/m²' },
  origin: { kind: 'observed', dataset: 'exis', resolution: 'sampled', satellite: 19 },
  visualization: 'time-series',
  points: [],
}

describe('localizeResultNames', () => {
  test('names the instrument, product and channel from the given catalogue', () => {
    const localized = localizeResultNames(result, getScientificSources(en))

    expect(localized.instrument).toEqual({
      code: 'EXIS',
      name: 'Extreme Ultraviolet and X-ray Irradiance Sensors',
    })
    expect(localized.product).toEqual({ code: 'SFXR', name: 'Solar flux: X-rays' })
    expect(localized.parameter).toEqual({
      code: '0.1-0.8nm',
      label: 'Long band (0.1–0.8 nm)',
      unit: 'W/m²',
    })
    expect(localized.points).toBe(result.points)
  })

  test('keeps what the result carries when the catalogue does not list it', () => {
    const unknownChannel = { ...result, parameter: { ...result.parameter, code: 'other' } }

    expect(localizeResultNames(unknownChannel, getScientificSources(en)).parameter).toEqual(
      unknownChannel.parameter,
    )
    expect(localizeResultNames(result, [])).toBe(result)
  })
})

describe('describeOrigin', () => {
  test('names every GOES dataset only as GOES, in both languages', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const dataset of SCIENTIFIC_DATASETS.filter((code) => code !== 'rosac')) {
        const { provider, notice } = describeOrigin(
          { kind: 'observed', dataset, resolution: 'sampled' },
          translate(locale),
        )
        expect(provider).toBe('GOES')
        expect(notice).not.toMatch(/CITIC|NOAA|LASCE|scientificData/)
      }
    }
  })

  test('says how many observations a sampled chart shows', () => {
    const origin = {
      kind: 'observed',
      dataset: 'mag',
      resolution: 'sampled',
      sampledPoints: 360,
    } as const

    expect(describeOrigin(origin, translate('es')).notice).toMatch(
      /^Promedios de 1 minuto del magnetómetro .* Se muestran 360 observaciones distribuidas uniformemente/,
    )
    expect(describeOrigin(origin, translate('en')).notice).toMatch(
      /^Magnetometer 1-minute averages .* 360 observations evenly spread/,
    )
  })

  test('says a full-resolution export was not sampled', () => {
    const { notice } = describeOrigin(
      { kind: 'observed', dataset: 'sgps', resolution: 'full' },
      translate('en'),
    )

    expect(notice).toMatch(
      /^SGPS 1-minute averages .* Not sampled: includes every valid observation/,
    )
  })

  test('describes the simulated ROSAC data as such', () => {
    expect(
      describeOrigin(
        { kind: 'simulated', dataset: 'rosac', resolution: 'sampled' },
        translate('en'),
      ),
    ).toEqual({
      provider: 'ROSAC prototype — UCR',
      notice: expect.stringMatching(/^Simulated data/),
    })
  })
})
