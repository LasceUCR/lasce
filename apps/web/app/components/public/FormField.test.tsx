import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import { FormField, type FormFieldProps } from './FormField'
import { Multiline, Select, Text } from './FormField.stories'

const textArgs = Text.args as FormFieldProps
const multilineArgs = Multiline.args as FormFieldProps
const selectArgs = Select.args as FormFieldProps

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

  test('renders a select with one option per entry when options are given', () => {
    render(<FormField {...selectArgs} />)

    const select = screen.getByRole('combobox', { name: selectArgs.label })
    expect(select).toHaveValue(selectArgs.value)
    expect(screen.getAllByRole('option')).toHaveLength(selectArgs.options?.length ?? 0)
  })

  test('calls onChange when a different option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FormField {...selectArgs} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: selectArgs.label }), 'waves')

    expect(onChange).toHaveBeenCalledWith('waves')
  })

})