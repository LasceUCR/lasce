import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { FormField, type FormFieldProps } from './FormField'
import { Default, Select, WithError, WithHint } from './FormField.stories'

const defaultArgs = Default.args as FormFieldProps
const withHintArgs = WithHint.args as FormFieldProps
const withErrorArgs = WithError.args as FormFieldProps
const selectArgs = Select.args as FormFieldProps

describe('FormField', () => {
  test('labels the input, marks it required and shows its placeholder', () => {
    render(<FormField {...defaultArgs} />)

    const input = screen.getByLabelText(defaultArgs.label)

    expect(input).toHaveAttribute('name', defaultArgs.name)
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('placeholder', defaultArgs.placeholder)
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAccessibleDescription()
  })

  test('reads the hint as part of the accessible description', () => {
    render(<FormField {...withHintArgs} />)

    const input = screen.getByLabelText(withHintArgs.label)

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAccessibleDescription(withHintArgs.hint)
  })

  test('marks the control invalid and describes it with the error', () => {
    render(<FormField {...withErrorArgs} />)

    const input = screen.getByLabelText(withErrorArgs.label)

    expect(input).toHaveValue(withErrorArgs.defaultValue)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(withErrorArgs.error)
    expect(screen.getByText(withErrorArgs.error ?? '')).toBeInTheDocument()
  })

  test('renders a select with an empty first option followed by one per entry', () => {
    render(<FormField {...selectArgs} />)

    const select = screen.getByRole('combobox', { name: selectArgs.label })
    const options = screen.getAllByRole('option')

    expect(select).toBeRequired()
    expect(select).toHaveValue('')
    expect(options).toHaveLength((selectArgs.options?.length ?? 0) + 1)
    expect(options[0]).toHaveTextContent(selectArgs.placeholder ?? '')
    expect(options[0]).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Costa Rica' })).toHaveValue('CR')
  })

  test('preselects the given default in a select', () => {
    render(<FormField {...selectArgs} defaultValue="CR" />)

    expect(screen.getByRole('combobox', { name: selectArgs.label })).toHaveValue('CR')
  })

  test('follows a changed default in a select, as after an echoed submission', () => {
    const { rerender } = render(<FormField {...selectArgs} />)
    expect(screen.getByRole('combobox', { name: selectArgs.label })).toHaveValue('')

    rerender(<FormField {...selectArgs} defaultValue="CR" />)

    expect(screen.getByRole('combobox', { name: selectArgs.label })).toHaveValue('CR')
  })
})
