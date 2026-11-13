/**
 * Countries offered by the registration form.
 *
 * ISO 3166-1 alpha-2 has no runtime enumeration in Node (`Intl.supportedValuesOf`
 * does not cover regions), so the officially assigned codes are listed here and
 * the display names come from ICU, in the visitor's language. `listCountries()`
 * is meant for Server Components: names are computed once on the server and
 * passed down as props, so the browser's ICU never has to agree with Node's.
 */

// prettier-ignore
export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW',
  'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT',
  'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export interface CountryOption {
  code: CountryCode
  /** Display name in the requested locale, e.g. "Costa Rica". */
  name: string
}

const codeSet: ReadonlySet<string> = new Set(COUNTRY_CODES)

export function isCountryCode(value: string): value is CountryCode {
  return codeSet.has(value)
}

const cache = new Map<string, CountryOption[]>()

/**
 * Every country with its display name in `locale` (Spanish by default), sorted the way a
 * speaker of that language expects (accents and case folded). Computed once per locale, per
 * process.
 */
export function listCountries(locale: string = 'es'): CountryOption[] {
  const cached = cache.get(locale)
  if (cached) return cached

  const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
  const countries = COUNTRY_CODES.map((code) => ({
    code,
    name: displayNames.of(code) ?? code,
  })).sort((a, b) => a.name.localeCompare(b.name, locale))
  cache.set(locale, countries)

  return countries
}

/**
 * The display name of a country in `locale` (Spanish by default), or the code itself when it is
 * unknown.
 */
export function countryName(code: string, locale: string = 'es'): string {
  return listCountries(locale).find((country) => country.code === code)?.name ?? code
}
