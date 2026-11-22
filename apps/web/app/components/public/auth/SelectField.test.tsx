import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { SelectField, type SelectFieldProps } from './SelectField'
import { Default, Selected, WithError } from './SelectField.stories'

const defaultArgs = Default.args as SelectFieldProps
const selectedArgs = Selected.args as SelectFieldProps
const withErrorArgs = WithError.args as SelectFieldProps

function inForm(props: SelectFieldProps) {
  return (
    <form aria-label="Formulario">
      <SelectField {...props} />
    </form>
  )
}

const submitted = (name: string) =>
  new FormData(screen.getByRole('form', { name: 'Formulario' }) as HTMLFormElement).get(name)

describe('SelectField', () => {
  test('labels the dropdown, marks it required and shows the placeholder', () => {
    render(inForm(defaultArgs))

    const trigger = screen.getByLabelText(defaultArgs.label, { exact: true })

    expect(trigger).toHaveAttribute('role', 'combobox')
    expect(trigger).toHaveAttribute('aria-required', 'true')
    expect(trigger).toHaveTextContent(defaultArgs.placeholder)
    expect(trigger).not.toHaveAttribute('aria-invalid')
    expect(trigger).not.toHaveAccessibleDescription()
    expect(submitted(defaultArgs.name)).toBe('')
  })

  test('submits the option chosen from the menu', async () => {
    const user = userEvent.setup()
    render(inForm(defaultArgs))

    await user.click(screen.getByRole('combobox', { name: defaultArgs.label }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(
      defaultArgs.options.map((option) => option.label),
    )
    await user.click(screen.getByRole('option', { name: 'Costa Rica' }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: defaultArgs.label })).toHaveTextContent(
      'Costa Rica',
    )
    expect(submitted(defaultArgs.name)).toBe('CR')
  })

  test('preselects the given default', () => {
    render(inForm(selectedArgs))

    expect(screen.getByRole('combobox', { name: selectedArgs.label })).toHaveTextContent(
      'Costa Rica',
    )
    expect(submitted(selectedArgs.name)).toBe('CR')
  })

  test('follows a changed default, as after an echoed submission', () => {
    const { rerender } = render(inForm(defaultArgs))
    expect(submitted(defaultArgs.name)).toBe('')

    rerender(inForm({ ...defaultArgs, defaultValue: 'MX' }))

    expect(screen.getByRole('combobox', { name: defaultArgs.label })).toHaveTextContent('México')
    expect(submitted(defaultArgs.name)).toBe('MX')
  })

  test('marks the dropdown invalid and describes it with the hint and the error', () => {
    render(inForm({ ...withErrorArgs, hint: 'El país de su institución.' }))

    const trigger = screen.getByRole('combobox', { name: withErrorArgs.label })

    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription(
      `El país de su institución. ${withErrorArgs.error ?? ''}`,
    )
    expect(screen.getByText(withErrorArgs.error ?? '')).toBeInTheDocument()
  })
})
