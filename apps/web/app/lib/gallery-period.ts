import { defaultLocale, type Locale } from '@/app/lib/i18n/config'

/**
 * The period an album covers, as the editor picks it: a start and an optional end, each a year with
 * an optional month. It is stored as the display string in `GalleryAlbum.yearsLabel`, exactly as
 * before ('2023–2025', 'febrero 2026', 'marzo 2024–junio 2025'), so the column and the API stay
 * unchanged. Month names are written in Spanish, the source language of the shared row, and
 * translated when the label is shown (`localizeYearsLabel`).
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

/**
 * English month names, January first. Only read: a label shown in English is parsed back when an
 * editor opens it, and saved with the Spanish names again.
 */
const englishMonthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
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

const point = `(?:(${[...periodMonthNames, ...englishMonthNames].join('|')})\\s+)?(\\d{4})`
const labelPattern = new RegExp(`^${point}(?:\\s*[–-]\\s*${point})?$`, 'i')

function monthNumber(name: string | undefined): number | null {
  if (!name) return null
  const lower = name.toLowerCase()
  const spanish = (periodMonthNames as readonly string[]).indexOf(lower)
  return (spanish >= 0 ? spanish : (englishMonthNames as readonly string[]).indexOf(lower)) + 1
}

/**
 * Reads a label back into a period, with its month names in Spanish or English. An empty label is an empty period; a label written by
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

type MonthName = (month: number) => string

const spanishMonthName: MonthName = (month) => periodMonthNames[month - 1] ?? ''

function pointLabel({ month, year }: PeriodPoint, monthName: MonthName): string {
  return month ? `${monthName(month)} ${year}` : String(year)
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
export function formatYearsLabel(
  { start, end }: AlbumPeriod,
  monthName: MonthName = spanishMonthName,
): string {
  if (!start.year) return ''

  const from = pointLabel(start, monthName)
  if (!end.year) return from

  const to = pointLabel(end, monthName)
  return to === from ? from : `${from}–${to}`
}

/**
 * A stored label as a visitor in `locale` reads it: its month names in that language
 * ('febrero 2026' is 'February 2026' in English). A label in any other shape is shown as stored.
 */
export function localizeYearsLabel(label: string, locale: Locale): string {
  const period = parseYearsLabel(label)
  if (!period?.start.year || locale === defaultLocale) return label

  const months = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
  return formatYearsLabel(period, (month) => months.format(Date.UTC(2000, month - 1, 1)))
}
