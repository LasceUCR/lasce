import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { LanguageMenu, type LanguageMenuProps } from './LanguageMenu'
import { Changing, Default, English } from './LanguageMenu.stories'

const defaultArgs = Default.args as LanguageMenuProps<string>

describe('LanguageMenu', () => {
  test('shows the current language on the trigger and names it in full', () => {
    render(<LanguageMenu {...defaultArgs} />)

    const trigger = screen.getByLabelText('Idioma: Español')

    expect(trigger).toHaveTextContent('ES')
    expect(screen.getByRole('button', { name: 'English', hidden: true })).not.toBeVisible()
  })

  test('lists every language by its own name once opened, marking the current one', async () => {
    const user = userEvent.setup()
    render(<LanguageMenu {...defaultArgs} />)

    await user.click(screen.getByLabelText('Idioma: Español'))

    const spanish = screen.getByRole('button', { name: 'Español' })
    const english = screen.getByRole('button', { name: 'English' })

    expect(spanish).toBeVisible()
    expect(spanish).toHaveAttribute('aria-current', 'true')
    expect(spanish).toHaveAttribute('lang', 'es')
    expect(english).not.toHaveAttribute('aria-current')
    expect(english).toHaveAttribute('lang', 'en')
  })

  test('reports the language the visitor chooses and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguageMenu {...defaultArgs} onChange={onChange} />)

    await user.click(screen.getByLabelText('Idioma: Español'))
    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('en')
    expect(screen.getByRole('button', { name: 'English', hidden: true })).not.toBeVisible()
  })

  test('does not report a change when the current language is chosen again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguageMenu {...defaultArgs} onChange={onChange} />)

    await user.click(screen.getByLabelText('Idioma: Español'))
    await user.click(screen.getByRole('button', { name: 'Español' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  test('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<LanguageMenu {...defaultArgs} />)

    const trigger = screen.getByLabelText('Idioma: Español')
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: 'English', hidden: true })).not.toBeVisible()
    expect(trigger).toHaveFocus()
  })

  test('shows the current language when it is not the default', () => {
    render(<LanguageMenu {...(English.args as LanguageMenuProps<string>)} />)

    expect(screen.getByLabelText('Language: English')).toHaveTextContent('EN')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-current', 'true')
  })

  test('cannot be changed while a change is being applied', () => {
    render(<LanguageMenu {...(Changing.args as LanguageMenuProps<string>)} />)

    expect(screen.getByRole('button', { name: 'English' })).toBeDisabled()
  })
})
