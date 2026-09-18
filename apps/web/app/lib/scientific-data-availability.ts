import { findScientificProduct, type ScientificDataQuery } from './scientific-data'

export interface SuviAvailability {
  start: string
  end: string
}

export function getSuviAvailability(now = new Date()): SuviAvailability {
  return {
    start: new Date(Math.ceil((now.getTime() - 86_400_000) / 60_000) * 60_000).toISOString(),
    end: new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString(),
  }
}

export function isSuviQuery(query: ScientificDataQuery) {
  return (
    query.source === 'GOES' &&
    findScientificProduct(query.source, query.product)?.product.visualization === 'image-sequence'
  )
}

export function getSuviTimeLimits(date: string, availability: SuviAvailability) {
  return {
    min: date === availability.start.slice(0, 10) ? availability.start.slice(11, 16) : '00:00',
    max: date === availability.end.slice(0, 10) ? availability.end.slice(11, 16) : '23:59',
  }
}

export function getAvailabilityMessage(query: ScientificDataQuery, availability: SuviAvailability) {
  if (query.source !== 'GOES') return null
  if (isSuviQuery(query)) {
    const start = `${query.date}T${query.startTime}:00.000Z`
    const end = `${query.date}T${query.endTime}:00.000Z`
    if (start < availability.start || end > availability.end) {
      return 'Las imágenes solares solo están disponibles en las últimas 24 horas. Seleccione una fecha y un horario dentro de ese intervalo (UTC).'
    }
  } else if (query.date > availability.end.slice(0, 10)) {
    return 'Seleccione una fecha que no sea posterior a hoy.'
  }
  return null
}

export function fitSuviQuery(
  query: ScientificDataQuery,
  availability: SuviAvailability,
): ScientificDataQuery {
  let date = query.date
  if (date < availability.start.slice(0, 10) || date > availability.end.slice(0, 10)) {
    date = availability.end.slice(0, 10)
  }
  let limits = getSuviTimeLimits(date, availability)
  // Around midnight, today may not yet contain a full selectable interval.
  if (limits.min === limits.max) {
    date =
      date === availability.end.slice(0, 10)
        ? availability.start.slice(0, 10)
        : availability.end.slice(0, 10)
    limits = getSuviTimeLimits(date, availability)
  }
  const startTime = query.startTime < limits.min ? limits.min : query.startTime
  const endTime = query.endTime > limits.max ? limits.max : query.endTime
  return {
    ...query,
    date,
    startTime: startTime < endTime ? startTime : limits.min,
    endTime: startTime < endTime ? endTime : limits.max,
  }
}
