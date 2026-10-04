import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { LanguageSwitcher, type LanguageSwitcherProps } from './LanguageSwitcher'
import { Changing, Compact, Default, English } from './LanguageSwitcher.stories'

const defaultArgs = Default.args as LanguageSwitcherProps<string>

describe('LanguageSwitcher', () => {
  test('offers every language under the name it was given, with the current one selected', () => {
    render(<LanguageSwitcher {...defaultArgs} />)

    const control = screen.getByRole('combobox', { name: 'Idioma' })

    expect(control).toHaveValue('es')
    expect(
      within(control)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Español', 'English'])
  })

  test('marks each language name with its own language', () => {
    render(<LanguageSwitcher {...defaultArgs} />)

    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('option', { name: 'Español' })).toHaveAttribute('lang', 'es')
  })

  test('reports the language the visitor chooses', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguageSwitcher {...defaultArgs} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'English')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('en')
  })

  test('shows short labels when compact, and still names each language in full', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <LanguageSwitcher {...(Compact.args as LanguageSwitcherProps<string>)} onChange={onChange} />,
    )

    const control = screen.getByRole('combobox', { name: 'Idioma' })

    expect(
      within(control)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['ES', 'EN'])

    await user.selectOptions(control, screen.getByRole('option', { name: 'English' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('en')
  })

  test('shows the current language when it is not the default', () => {
    render(<LanguageSwitcher {...(English.args as LanguageSwitcherProps<string>)} />)

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  })

  test('cannot be changed while a change is being applied', () => {
    render(<LanguageSwitcher {...(Changing.args as LanguageSwitcherProps<string>)} />)

    expect(screen.getByRole('combobox', { name: 'Idioma' })).toBeDisabled()
  })
})
