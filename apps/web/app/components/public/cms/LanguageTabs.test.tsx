import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { LOCALE_COOKIE, type Locale } from '@/app/lib/i18n/config'

import { LanguageTabs, type LanguageTabsProps } from './LanguageTabs'
import { EnglishSelected, Spanish, WithFlags } from './LanguageTabs.stories'

const setLocale = vi.hoisted(() => vi.fn())
const refresh = vi.hoisted(() => vi.fn())

// Neither should ever be reached from an editor's language tabs; mocked to prove it.
vi.mock('@/app/lib/i18n/actions', () => ({ setLocale }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const spanishArgs = Spanish.args as LanguageTabsProps

/** Owns the selection, as an editor does. */
function Harness(props: Partial<LanguageTabsProps>) {
  const [selected, setSelected] = useState<Locale>(props.selected ?? 'es')
  return (
    <LanguageTabs
      {...spanishArgs}
      {...props}
      onSelect={(locale) => {
        setSelected(locale)
        props.onSelect?.(locale)
      }}
      selected={selected}
    />
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('LanguageTabs', () => {
  test('shows one tab per language, named in that language, with the selected one active', () => {
    render(<Harness />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Español', 'English'])
    expect(screen.getByRole('tablist', { name: 'Idioma del contenido' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveAttribute('lang', 'es')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveAttribute('lang', 'en')
  })

  test('links each tab to its panel and shows only the selected panel', () => {
    render(<Harness />)

    const panel = screen.getByRole('tabpanel', { name: 'Español' })
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByLabelText(/Nombre \(Español\)/)).toBeVisible()
    // The other panel is mounted but hidden, so what was typed there is kept.
    expect(screen.getByLabelText(/Nombre \(English\)/)).not.toBeVisible()
  })

  test('keeps only the selected tab in the Tab sequence', () => {
    render(<Harness />)

    expect(screen.getByRole('tab', { name: 'Español' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveAttribute('tabindex', '-1')
  })

  test('moves between tabs with the arrow keys, Home and End, and wraps around', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('tab', { name: 'Español' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'English' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Español' })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveFocus()
    expect(screen.getByLabelText(/Nombre \(English\)/)).toBeVisible()
  })

  test('selects a tab on click and reports it', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.click(screen.getByRole('tab', { name: 'English' }))

    expect(onSelect).toHaveBeenCalledWith('en')
    expect(screen.getByRole('tab', { name: 'English' })).toHaveAttribute('aria-selected', 'true')
  })

  test('follows the selection its parent sets, such as a tab with errors', () => {
    render(<LanguageTabs {...(EnglishSelected.args as LanguageTabsProps)} />)

    expect(screen.getByRole('tab', { name: /^English/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/Nombre \(English\)/)).toBeVisible()
  })

  test('adds each flag to its tab accessible name, in Spanish', () => {
    render(<LanguageTabs {...(WithFlags.args as LanguageTabsProps)} />)

    expect(screen.getByRole('tab', { name: 'Español' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'English · 2 por revisar' })).toBeInTheDocument()
    expect(screen.getByText('2 por revisar')).toHaveAttribute('lang', 'es')
  })

  test('gives every editor on the page its own ids', () => {
    render(
      <>
        <Harness />
        <Harness />
      </>,
    )

    const ids = [
      ...screen.getAllByRole('tab'),
      ...screen.getAllByRole('tabpanel', { hidden: true }),
    ].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('never changes the site language', async () => {
    const user = userEvent.setup()
    document.cookie = `${LOCALE_COOKIE}=es; path=/`
    render(<Harness />)

    await user.click(screen.getByRole('tab', { name: 'English' }))
    await user.keyboard('{ArrowLeft}{End}{Home}')

    expect(setLocale).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`)
    expect(document.documentElement).not.toHaveAttribute('lang', 'en')
  })
})
