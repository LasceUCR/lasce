export interface LanguageOption<TLocale extends string> {
  value: TLocale
  /** The language's own name, for example `English`. */
  label: string
}

export interface LanguageSwitcherProps<TLocale extends string> {
  /** Accessible name of the control, in the current language. */
  label: string
  /** The language the page is rendered in. */
  locale: TLocale
  options: readonly LanguageOption<TLocale>[]
  onChange: (locale: TLocale) => void
  /** Set while a change is being applied. */
  disabled?: boolean
}

/**
 * Lets a visitor choose the site's language. A native `<select>`, so it grows with the list of
 * languages and fits the mobile menu's list; the desktop header uses `LanguageMenu`. Presentational:
 * the header owns the current locale and the Server Action that stores a new one.
 */
export function LanguageSwitcher<TLocale extends string>({
  label,
  locale,
  options,
  onChange,
  disabled = false,
}: LanguageSwitcherProps<TLocale>) {
  return (
    <select
      aria-label={label}
      className="language-switcher"
      disabled={disabled}
      onChange={(event) => {
        const next = options.find((option) => option.value === event.target.value)
        if (next) onChange(next.value)
      }}
      value={locale}
    >
      {options.map((option) => (
        // Each name is written in its own language, so it is announced with that language's
        // pronunciation rather than the page's.
        <option key={option.value} lang={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
