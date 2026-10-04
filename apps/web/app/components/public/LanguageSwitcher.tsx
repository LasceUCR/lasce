export interface LanguageOption<TLocale extends string> {
  value: TLocale
  /** The language's own name, for example `English`. */
  label: string
  /** What the compact control shows instead, for example `EN`. */
  shortLabel: string
}

export interface LanguageSwitcherProps<TLocale extends string> {
  /** Accessible name of the control, in the current language. */
  label: string
  /** The language the page is rendered in. */
  locale: TLocale
  options: readonly LanguageOption<TLocale>[]
  onChange: (locale: TLocale) => void
  /**
   * Show each language's short label, for the desktop header where the full name does not fit
   * beside the navigation. The full name stays the option's accessible name.
   */
  compact?: boolean
  /** Set while a change is being applied. */
  disabled?: boolean
}

/**
 * Lets a visitor choose the site's language. A native `<select>`, so it grows with the list of
 * languages and behaves the same in the desktop header and the mobile menu. Presentational:
 * the header owns the current locale and the Server Action that stores a new one.
 */
export function LanguageSwitcher<TLocale extends string>({
  label,
  locale,
  options,
  onChange,
  compact = false,
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
        <option
          aria-label={compact ? option.label : undefined}
          key={option.value}
          lang={option.value}
          value={option.value}
        >
          {compact ? option.shortLabel : option.label}
        </option>
      ))}
    </select>
  )
}
