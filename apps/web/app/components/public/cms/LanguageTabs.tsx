'use client'

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

import { defaultLocale, localeLabels, locales, type Locale } from '@/app/lib/i18n/config'

export interface LanguageTabsProps {
  /** The language being edited. The parent owns it, so it can open a tab that has errors. */
  selected: Locale
  onSelect: (locale: Locale) => void
  /**
   * A short note per language, shown after its name: `'2 por revisar'`, `'Sin traducción'`.
   * `languageTabFlags` (`app/lib/i18n/content/form.ts`) computes it.
   */
  flags?: Partial<Record<Locale, string | null>>
  /** Accessible name of the tab list. */
  label?: string
  /** The fields of one language. Rendered for every language; only the selected one shows. */
  children: (locale: Locale) => ReactNode
}

/**
 * One tab per supported language for the translatable fields of an editor, following the
 * WAI-ARIA tabs pattern: arrow keys, Home and End move between tabs, and only the selected tab is
 * in the Tab sequence. Every panel stays mounted, so switching never loses what was typed, and a
 * hidden panel's fields carry the `hidden` attribute a "focus the first invalid field" query can
 * skip. Ids come from `useId`, so several editors can be on the page at once.
 *
 * These tabs only choose which translation is being edited. They never change the site's
 * language: that is the header's language selector and its `lasce_locale` cookie.
 *
 * Panels carry no `lang`: besides the content, they hold the editor's own labels and messages,
 * which are not in the panel's language. Mark the language of each text field on the field itself
 * (`FormField`'s `lang`, from `contentFieldLang` in `app/lib/i18n/content/form.ts`).
 */
export function LanguageTabs({
  selected,
  onSelect,
  flags = {},
  label = 'Idioma del contenido',
  children,
}: LanguageTabsProps) {
  const id = useId()
  const tabRefs = useRef<Partial<Record<Locale, HTMLButtonElement | null>>>({})

  function select(locale: Locale, moveFocus: boolean) {
    onSelect(locale)
    if (moveFocus) tabRefs.current[locale]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = locales.indexOf(selected)
    const last = locales.length - 1
    let target: Locale | undefined

    if (event.key === 'ArrowRight') target = locales[index === last ? 0 : index + 1]
    else if (event.key === 'ArrowLeft') target = locales[index === 0 ? last : index - 1]
    else if (event.key === 'Home') target = locales[0]
    else if (event.key === 'End') target = locales[last]

    if (!target) return
    event.preventDefault()
    select(target, true)
  }

  return (
    <>
      <div aria-label={label} className="access-tabs" onKeyDown={handleKeyDown} role="tablist">
        {locales.map((locale) => {
          const flag = flags[locale]

          return (
            <button
              aria-controls={`${id}-${locale}-panel`}
              aria-selected={selected === locale}
              className="access-tab"
              id={`${id}-${locale}-tab`}
              key={locale}
              lang={locale}
              onClick={() => select(locale, false)}
              ref={(element) => {
                tabRefs.current[locale] = element
              }}
              role="tab"
              tabIndex={selected === locale ? 0 : -1}
              type="button"
            >
              {localeLabels[locale]}
              {flag ? (
                <>
                  {' · '}
                  {/* The note is editor copy, written in the source language. */}
                  <span className="cms-language-tab-flag" lang={defaultLocale}>
                    {flag}
                  </span>
                </>
              ) : null}
            </button>
          )
        })}
      </div>

      {locales.map((locale) => (
        <div
          aria-labelledby={`${id}-${locale}-tab`}
          className="cms-language-panel"
          hidden={selected !== locale}
          id={`${id}-${locale}-panel`}
          key={locale}
          role="tabpanel"
        >
          {children(locale)}
        </div>
      ))}
    </>
  )
}
