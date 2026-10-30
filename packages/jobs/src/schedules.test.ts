import { describe, expect, test } from 'vitest'

import { schedules } from './schedules'

const exis = schedules.filter((schedule) => schedule.name === 'exis-pipeline')
const mag = schedules.filter((schedule) => schedule.name === 'mag-pipeline')
const seiss = schedules.filter((schedule) => schedule.name === 'seiss-pipeline')

describe('schedules', () => {
  test('every scheduler entry has its own id', () => {
    const ids = schedules.map((schedule) => schedule.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('EXIS is ingested once per product', () => {
    const products = exis.map((schedule) => (schedule.data as { product: string }).product)

    expect(products.sort()).toEqual(['SFEU', 'SFXR'])
  })

  // NOAA publishes one EXIS file per day; docs/exis-pipeline.md promises hourly at minute 20.
  test('EXIS runs hourly at minute 20, not every minute', () => {
    expect(exis.map((schedule) => schedule.cron)).toEqual(['20 * * * *', '20 * * * *'])
  })

  // NOAA publishes one MAG 1-minute file per day; docs/mag-pipeline.md promises hourly at minute 25.
  test('MAG ingests GOES-19 hourly at minute 25', () => {
    expect(mag).toHaveLength(1)
    expect(mag[0]?.cron).toBe('25 * * * *')
    expect(mag[0]?.data).toEqual({ spacecraft: 19, lookbackDays: 3 })
  })

  // NOAA publishes one file per SEISS product per day; docs/seiss-pipeline.md promises each product
  // hourly on its own minute.
  test('SEISS ingests each GOES-19 product hourly on its own minute', () => {
    expect(seiss.map((schedule) => [schedule.cron, schedule.data])).toEqual([
      ['35 * * * *', { product: 'EHIS', spacecraft: 19, lookbackDays: 3 }],
      ['40 * * * *', { product: 'SGPS', spacecraft: 19, lookbackDays: 3 }],
    ])
  })
})
