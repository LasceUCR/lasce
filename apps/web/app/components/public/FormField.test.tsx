import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { FormField, type FormFieldProps } from './FormField'
import { Multiline, Text } from './FormField.stories'

const textArgs = Text.args as FormFieldProps
const multilineArgs = Multiline.args as FormFieldProps

describe('FormField', () => {
  test('renders a text box with the given label and value', () => {
    render(<FormField {...textArgs} />)

    expect(screen.getByRole('textbox', { name: textArgs.label })).toHaveValue(textArgs.value)
  })

  test('calls onChange as the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FormField {...textArgs} onChange={onChange} value="" />)

    await user.type(screen.getByRole('textbox', { name: textArgs.label }), 'a')

    expect(onChange).toHaveBeenCalledWith('a')
  })

  test('renders a textarea when multiline is set', () => {
    render(<FormField {...multilineArgs} />)

    const field = screen.getByRole('textbox', { name: multilineArgs.label })
    expect(field.tagName).toBe('TEXTAREA')
  })
})
