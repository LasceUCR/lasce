import { describe, expect, test } from 'vitest'

import { flareClass, hasFlareClasses } from './flareClass'

describe('flareClass', () => {
  test('names the 5 November maximum an M3.4, despite floating-point rounding', () => {
    expect(flareClass(3.35e-5)).toEqual({ letter: 'M', magnitude: 3.4, label: 'M3.4' })
  })

  test.each([
    [5e-9, 'A0.5'],
    [1e-8, 'A1.0'],
    [2.5e-7, 'B2.5'],
    [6.75e-7, 'B6.8'],
    [1.05e-6, 'C1.1'],
    [4.45e-6, 'C4.5'],
    [1e-5, 'M1.0'],
    [1e-4, 'X1.0'],
    [1.234e-3, 'X12.3'],
  ])('classifies %s W/m² as %s', (flux, label) => {
    expect(flareClass(flux)?.label).toBe(label)
  })

  test('moves up a class when the number rounds to 10', () => {
    expect(flareClass(9.96e-6)?.label).toBe('M1.0')
    expect(flareClass(9.96e-5)?.label).toBe('X1.0')
  })

  test('has no class for a value that is not a positive flux', () => {
    expect(flareClass(0)).toBeNull()
    expect(flareClass(-1e-6)).toBeNull()
    expect(flareClass(Number.NaN)).toBeNull()
  })

  test('applies to the 0.1–0.8 nm X-ray band only', () => {
    expect(hasFlareClasses('SFXR', '0.1-0.8nm')).toBe(true)
    expect(hasFlareClasses('SFXR', '0.05-0.4nm')).toBe(false)
    expect(hasFlareClasses('GEOF', 'total')).toBe(false)
  })
})
