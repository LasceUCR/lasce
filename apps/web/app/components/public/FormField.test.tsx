import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { FormField, type FormFieldProps } from './FormField'
import { Multiline, Select, Text } from './FormField.stories'

function ControlledField({
  initialValue = '',
  ...props
}: Omit<FormFieldProps, 'value' | 'onChange'> & { initialValue?: string }) {
  const [value, setValue] = useState(initialValue)
  return <FormField {...props} onChange={setValue} value={value} />
}

/** Mimics a real caller like NewsArticleForm: a fresh `validate` closure built on every render,
 * not a stable reference — the exact shape that used to spuriously retrigger a sibling field. */
function TwoFieldsForm() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  return (
    <>
      <FormField label="Campo A" onChange={setA} value={a} />
      <FormField
        label="Campo B"
        onChange={setB}
        validate={(value) => {
          if (value.trim() === '') throw new Error('Campo B requerido.')
        }}
        value={b}
      />
    </>
  )
}

const textArgs = Text.args as FormFieldProps
const multilineArgs = Multiline.args as FormFieldProps
const selectArgs = Select.args as FormFieldProps

describe('FormField', () => {
  test('renders a text box with the given label and value', () => {
    render(<FormField {...textArgs} />)

    expect(screen.getByRole('textbox', { name: textArgs.label })).toHaveValue(textArgs.value)
  })

  test('marks the label with an asterisk when required', () => {
    render(<FormField {...textArgs} required />)

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: textArgs.label })).toHaveAttribute(
      'aria-required',
      'true',
    )
  })

  test('does not show an asterisk when not required', () => {
    render(<FormField {...textArgs} required={false} />)

    expect(screen.queryByText('*')).not.toBeInTheDocument()
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

  describe('debounced validation', () => {
    const validate = (value: string) => {
      if (value.trim() === '') throw new Error('Campo requerido.')
    }

    test('does not validate the initial value on mount, even when it is invalid', async () => {
      render(<ControlledField {...textArgs} initialValue="" validate={validate} />)

      await new Promise((resolve) => setTimeout(resolve, 700))

      expect(screen.queryByText('Campo requerido.')).not.toBeInTheDocument()
    })

    test('shows the message a validate function throws, after the value sits idle', async () => {
      const user = userEvent.setup()
      render(<ControlledField {...textArgs} initialValue="algo" validate={validate} />)
      const field = screen.getByRole('textbox', { name: textArgs.label })

      await user.clear(field)
      expect(screen.queryByText('Campo requerido.')).not.toBeInTheDocument()

      expect(await screen.findByText('Campo requerido.', {}, { timeout: 2000 })).toBeInTheDocument()
      expect(field).toHaveAttribute('aria-invalid', 'true')
    }, 10000)

    test('clears a previous error automatically once the value becomes valid, without needing to blur', async () => {
      const user = userEvent.setup()
      render(<ControlledField {...textArgs} initialValue="algo" validate={validate} />)
      const field = screen.getByRole('textbox', { name: textArgs.label })

      await user.clear(field)
      expect(await screen.findByText('Campo requerido.', {}, { timeout: 2000 })).toBeInTheDocument()

      await user.type(field, 'otro valor')

      await waitFor(
        () => {
          expect(screen.queryByText('Campo requerido.')).not.toBeInTheDocument()
        },
        { timeout: 2000 },
      )
      expect(field).not.toHaveAttribute('aria-invalid')
    }, 10000)

    test('never shows an error when no validate function is given', async () => {
      const user = userEvent.setup()
      render(<ControlledField {...textArgs} initialValue="algo" />)
      const field = screen.getByRole('textbox', { name: textArgs.label })

      await user.clear(field)
      await new Promise((resolve) => setTimeout(resolve, 700))

      expect(field).not.toHaveAttribute('aria-invalid')
    }, 10000)

    test("does not validate the initial value on mount under React Strict Mode's double effect invocation", async () => {
      // Plain `render` doesn't double-invoke effects the way Next's dev server
      // (which enables Strict Mode) does — this is the case that actually
      // caught a flag mutated inside the effect body seeing its own prior
      // flip on the second, Strict-Mode-only run and validating right away.
      render(
        <StrictMode>
          <ControlledField {...textArgs} initialValue="" validate={validate} />
        </StrictMode>,
      )

      await new Promise((resolve) => setTimeout(resolve, 700))

      expect(screen.queryByText('Campo requerido.')).not.toBeInTheDocument()
    }, 10000)

    test('does not validate an untouched sibling field just because typing elsewhere re-rendered it with a new validate closure', async () => {
      const user = userEvent.setup()
      render(<TwoFieldsForm />)

      await user.type(screen.getByRole('textbox', { name: 'Campo A' }), 'hola')
      await new Promise((resolve) => setTimeout(resolve, 700))

      expect(screen.queryByText('Campo B requerido.')).not.toBeInTheDocument()
    }, 10000)
  })
})
