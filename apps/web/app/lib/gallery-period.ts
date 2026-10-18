/**
 * The period an album covers, as the editor picks it: a start and an optional end, each a year with
 * an optional month. It is stored as the display string in `GalleryAlbum.yearsLabel`, exactly as
 * before ('2023–2025', 'febrero 2026', 'marzo 2024–junio 2025'), so the column and the API stay
 * unchanged. Month names are written in Spanish, the source language of the shared row.
 */

/** Spanish month names, January first: the form stored in `yearsLabel`. */
export const periodMonthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** One end of a period. `month` is 1–12 or `null`; `year` is `null` while nothing is chosen. */
export interface PeriodPoint {
  month: number | null
  year: number | null
}

export interface AlbumPeriod {
  start: PeriodPoint
  end: PeriodPoint
}

export type PeriodError = 'monthNeedsYear' | 'endNeedsStart' | 'endBeforeStart'

export const emptyPeriod: AlbumPeriod = {
  start: { month: null, year: null },
  end: { month: null, year: null },
}

const point = `(?:(${periodMonthNames.join('|')})\\s+)?(\\d{4})`
const labelPattern = new RegExp(`^${point}(?:\\s*[–-]\\s*${point})?$`, 'i')

function monthNumber(name: string | undefined): number | null {
  if (!name) return null
  return periodMonthNames.indexOf(name.toLowerCase() as (typeof periodMonthNames)[number]) + 1
}

/**
 * Reads a stored label back into a period. An empty label is an empty period; a label written by
 * hand in some other shape returns `null`, so the editor can keep it until a period is chosen.
 */
export function parseYearsLabel(label: string): AlbumPeriod | null {
  const trimmed = label.trim()
  if (!trimmed) return emptyPeriod

  const match = labelPattern.exec(trimmed)
  if (!match) return null

  const [, startMonth, startYear, endMonth, endYear] = match
  return {
    start: { month: monthNumber(startMonth), year: Number(startYear) },
    end: endYear
      ? { month: monthNumber(endMonth), year: Number(endYear) }
      : { month: null, year: null },
  }
}

function pointLabel({ month, year }: PeriodPoint): string {
  return month ? `${periodMonthNames[month - 1]} ${year}` : String(year)
}

/** The first problem with a period, or `null` when it can be saved. */
export function periodError({ start, end }: AlbumPeriod): PeriodError | null {
  if ((start.month && !start.year) || (end.month && !end.year)) return 'monthNeedsYear'
  if (end.year && !start.year) return 'endNeedsStart'
  if (start.year && end.year) {
    const startsAt = start.year * 12 + (start.month ?? 1)
    const endsAt = end.year * 12 + (end.month ?? 12)
    if (endsAt < startsAt) return 'endBeforeStart'
  }
  return null
}

/**
 * The label stored for a valid period: empty when no start is chosen, and a single point when the
 * end is missing or says the same thing as the start.
 */
export function formatYearsLabel({ start, end }: AlbumPeriod): string {
  if (!start.year) return ''

  const from = pointLabel(start)
  if (!end.year) return from

  const to = pointLabel(end)
  return to === from ? from : `${from}–${to}`
}
