/*
 * GOES solar flare classes, from the 0.1–0.8 nm (XRS-B, "long band") X-ray flux in W/m². NOAA
 * defines the classes on that band only, so the 0.05–0.4 nm band is never classified. Each class
 * spans one decade: A from 1e-8, B from 1e-7, C from 1e-6, M from 1e-5 and X from 1e-4 (X has no
 * upper bound, so an X12.3 is possible). The number is the flux in units of the class's lower
 * bound, with one decimal: 3.35e-5 W/m² is M3.4.
 */

export const FLARE_CLASSES = [
  { letter: 'A', exponent: -8 },
  { letter: 'B', exponent: -7 },
  { letter: 'C', exponent: -6 },
  { letter: 'M', exponent: -5 },
  { letter: 'X', exponent: -4 },
] as const

export type FlareClassLetter = (typeof FLARE_CLASSES)[number]['letter']

export interface FlareClass {
  letter: FlareClassLetter
  /** The flux in units of the class's lower bound, rounded to one decimal. */
  magnitude: number
  /** `M3.4`: written the same way in every language. */
  label: string
}

/** The product and channel whose readings are classified. */
export const FLARE_CLASS_PRODUCT = 'SFXR'
export const FLARE_CLASS_PARAMETER = '0.1-0.8nm'

export function hasFlareClasses(product: string, parameter: string) {
  return product === FLARE_CLASS_PRODUCT && parameter === FLARE_CLASS_PARAMETER
}

/**
 * Rounds to one decimal without floating-point surprises: 3.35e-5 × 1e5 is 3.3500000000000005 or
 * 3.3499999999999996 depending on the operations, so the value is first cut to 12 significant
 * digits (exactly 3.35) and only then rounded half up.
 */
function oneDecimal(value: number) {
  return Math.round(Number(value.toPrecision(12)) * 10) / 10
}

/** The flare class of an X-ray flux in W/m²; `null` for a value that is not a positive flux. */
export function flareClass(flux: number): FlareClass | null {
  if (!Number.isFinite(flux) || flux <= 0) return null

  const exponent = Math.floor(Number(Math.log10(flux).toPrecision(12)))
  let index = Math.min(Math.max(exponent - FLARE_CLASSES[0].exponent, 0), FLARE_CLASSES.length - 1)
  // Multiplying by a power of ten above one is exact; dividing by 1e-5 would not be.
  let magnitude = oneDecimal(flux * 10 ** -FLARE_CLASSES[index]!.exponent)
  // M9.96 rounds to 10.0, which is X1.0.
  if (magnitude >= 10 && index < FLARE_CLASSES.length - 1) {
    index += 1
    magnitude = oneDecimal(flux * 10 ** -FLARE_CLASSES[index]!.exponent)
  }

  const { letter } = FLARE_CLASSES[index]!
  return { letter, magnitude, label: `${letter}${magnitude.toFixed(1)}` }
}
