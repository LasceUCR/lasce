import type { ScientificDataQuery } from './scientific-data'

export interface GoesAvailability {
  /** The current UTC date, `YYYY-MM-DD`: the latest day any GOES product can hold. */
  today: string
}

/**
 * How many days NOAA takes to publish a day of each GOES instrument. SUVI images are current;
 * the EXIS, MAG, EHIS, SGPS and MPS-HI files are published with about a day of delay, so their
 * latest day is yesterday.
 */
const PUBLICATION_LAG_DAYS: Record<string, number> = { SUVI: 0 }
const DEFAULT_PUBLICATION_LAG_DAYS = 1

export function getGoesAvailability(now = new Date()): GoesAvailability {
  return { today: now.toISOString().slice(0, 10) }
}

/** The latest day that already has data for a GOES instrument, `YYYY-MM-DD`. */
export function getLatestAvailableDate(
  instrumentCode: string,
  availability: GoesAvailability,
): string {
  const lag = PUBLICATION_LAG_DAYS[instrumentCode] ?? DEFAULT_PUBLICATION_LAG_DAYS
  const date = new Date(`${availability.today}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - lag)
  return date.toISOString().slice(0, 10)
}

export function getAvailabilityMessage(
  query: ScientificDataQuery,
  availability: GoesAvailability,
  message: string,
) {
  if (query.source === 'GOES' && query.date > availability.today) {
    return message
  }
  return null
}
