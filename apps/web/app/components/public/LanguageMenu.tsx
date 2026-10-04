'use client'

import { Check, ChevronDown, Globe } from 'lucide-react'

import { useDisclosure } from './useDisclosure'

export interface LanguageMenuOption<TLocale extends string> {
  value: TLocale
  /** The language's own name, for example `English`. */
  label: string
  /** What the trigger shows for it, for example `EN`. */
  shortLabel: string
}

export interface LanguageMenuProps<TLocale extends string> {
  /** What the control is, in the current language: `Idioma`. */
  label: string
  /** The language the page is rendered in. */
  locale: TLocale
  options: readonly LanguageMenuOption<TLocale>[]
  onChange: (locale: TLocale) => void
  /** Set while a change is being applied. */
  disabled?: boolean
  /** Start open. Stories use it to show the panel. */
  defaultOpen?: boolean
}

/**
 * The language choice in the desktop header: a globe and the current language's short label,
 * opening the same disclosure the nav groups and the account menu use (`useDisclosure`,
 * `.nav-group`, `.nav-group-panel`), so the header has one dropdown style. The panel lists each
 * language by its own name and marks the current one. The mobile menu uses the native
 * `LanguageSwitcher` instead. Presentational: the header owns the locale and the Server Action.
 */
export function LanguageMenu<TLocale extends string>({
  label,
  locale,
  options,
  onChange,
  disabled = false,
  defaultOpen = false,
}: LanguageMenuProps<TLocale>) {
  const {
    detailsRef,
    summaryRef,
    open,
    close,
    handleSummaryClick,
    handleMouseLeave,
    handleKeyDown,
    handleBlur,
  } = useDisclosure()
  const current = options.find((option) => option.value === locale)

  return (
    <details
      className="nav-group language-menu"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={open}
      onMouseLeave={handleMouseLeave}
      open={defaultOpen ? true : undefined}
      ref={detailsRef}
    >
      <summary
        aria-label={current ? `${label}: ${current.label}` : label}
        onClick={handleSummaryClick}
        ref={summaryRef}
      >
        <Globe aria-hidden="true" size={18} strokeWidth={1.8} />
        {current?.shortLabel}
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.6} />
      </summary>
      <div className="nav-group-panel language-menu-panel">
        {options.map((option) => {
          const isCurrent = option.value === locale

          return (
            <button
              aria-current={isCurrent ? 'true' : undefined}
              className={isCurrent ? 'active' : undefined}
              disabled={disabled}
              key={option.value}
              // Each name is written in its own language, so it is announced with that
              // language's pronunciation rather than the page's.
              lang={option.value}
              onClick={() => {
                close()
                if (!isCurrent) onChange(option.value)
              }}
              type="button"
            >
              {option.label}
              {isCurrent ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
            </button>
          )
        })}
      </div>
    </details>
  )
}
