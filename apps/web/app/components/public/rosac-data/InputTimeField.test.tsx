import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { InputTimeField, type InputTimeFieldProps } from './InputTimeField'
import { Date, Time, Labeled, Disabled } from './InputTimeField.stories'

const dateArgs = Date.args as InputTimeFieldProps
const timeArgs = Time.args as InputTimeFieldProps
const LabeledArgs = Labeled.args as InputTimeFieldProps
const DisabledArgs = Disabled.args as InputTimeFieldProps

describe('InputTimeField', () => {
  test('renders a date type input field', () => {
    const { container } = render(<InputTimeField {...dateArgs} />)

    expect(container.querySelector('input')).toHaveAttribute(
      'type',
      'date',
    )
    expect(container.querySelector('input')).not.toHaveAttribute(
      'disabled'
    )
  })

  test('renders a time type input field', () => {
    const { container } = render(<InputTimeField {...timeArgs} />)

    expect(container.querySelector('input')).toHaveAttribute(
      'type',
      'time',
    )
    expect(container.querySelector('input')).not.toHaveAttribute(
      'disabled'
    )
  })

  test('renders a disabled input field', () => {
    const { container } = render(<InputTimeField {...DisabledArgs} />)

    expect(container.querySelector('input')).toHaveAttribute(
      'disabled'
    )
  })
})