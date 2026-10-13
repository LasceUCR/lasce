import { describe, expect, test } from 'vitest'

import { schedules } from './schedules'

const exis = schedules.filter((schedule) => schedule.name === 'exis-pipeline')

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
})
