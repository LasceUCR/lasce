import type { ScientificDataQuery } from './scientific-data'

export interface GoesAvailability {
  /** The current UTC date, `YYYY-MM-DD`: the latest day any GOES product can hold. */
  today: string
}

export function getGoesAvailability(now = new Date()): GoesAvailability {
  return { today: now.toISOString().slice(0, 10) }
}

export function getAvailabilityMessage(query: ScientificDataQuery, availability: GoesAvailability) {
  if (query.source === 'GOES' && query.date > availability.today) {
    return 'Seleccione una fecha que no sea posterior a hoy.'
  }
  return null
}
