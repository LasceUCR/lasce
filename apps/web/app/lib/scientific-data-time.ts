import type { ScientificDataQuery } from './scientific-data'

/**
 * Time arithmetic for a `/datos` query. A query is one UTC `date` with a `startTime` and an
 * `endTime`; an end earlier than the start means the range crosses midnight and ends on the next
 * day, so 23:00–01:00 is two hours. Equal times are not a range (the schema rejects them). A range
 * never reaches 24 hours, which keeps the one-day limit.
 */

const MINUTES_PER_DAY = 24 * 60

/** Costa Rica has no daylight saving time, so its offset from UTC is fixed. */
const COSTA_RICA_OFFSET_MINUTES = -6 * 60

type QueryTimes = Pick<ScientificDataQuery, 'startTime' | 'endTime'>

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours! * 60 + minutes!
}

/** `HH:mm` strings compare in time order, so a smaller end is on the next day. */
export function crossesMidnight(query: QueryTimes): boolean {
  return query.endTime < query.startTime
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/**
 * The first and last instants a query covers, as UTC timestamps. The last one is the end of the
 * final minute, and falls on the next day when the range crosses midnight.
 */
export function getQueryWindow(query: Pick<ScientificDataQuery, 'date'> & QueryTimes): {
  start: string
  end: string
} {
  const endDate = crossesMidnight(query) ? addDays(query.date, 1) : query.date
  return {
    start: `${query.date}T${query.startTime}:00Z`,
    end: `${endDate}T${query.endTime}:59.999Z`,
  }
}

/** The minutes of the query as offsets from the start of its UTC date, end included. */
export function getQueryMinuteRange(query: QueryTimes): { start: number; end: number } {
  const start = toMinutes(query.startTime)
  const end = toMinutes(query.endTime)
  return { start, end: crossesMidnight(query) ? end + MINUTES_PER_DAY : end }
}

export interface LocalTime {
  /** `HH:mm` in Costa Rica time. */
  time: string
  /** Days from the query's UTC date: `-1` the day before, `1` the day after. */
  dayOffset: number
}

/** A UTC time, `dayOffset` days after the query's date, as Costa Rica time (UTC−6). */
export function toCostaRicaTime(utcTime: string, dayOffset = 0): LocalTime {
  const local = toMinutes(utcTime) + dayOffset * MINUTES_PER_DAY + COSTA_RICA_OFFSET_MINUTES
  const day = Math.floor(local / MINUTES_PER_DAY)
  const minutes = local - day * MINUTES_PER_DAY
  const hours = Math.floor(minutes / 60)
  return {
    time: `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    dayOffset: day,
  }
}

/** Both ends of a query's range in Costa Rica time. */
export function getLocalRange(query: QueryTimes): { start: LocalTime; end: LocalTime } {
  return {
    start: toCostaRicaTime(query.startTime),
    end: toCostaRicaTime(query.endTime, crossesMidnight(query) ? 1 : 0),
  }
}
