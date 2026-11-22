'use client'

import { useId, useState } from 'react'

import { Select } from '../Select'
import type { FormFieldOption } from './FormField'

export interface SelectFieldProps {
  /** Submitted field name, carried by a hidden input; also keys the generated ids. */
  name: string
  label: string
  options: FormFieldOption[]
  /** Trigger text while nothing is chosen; the field then submits an empty value. */
  placeholder: string
  /** Short guidance shown under the control and read as part of its description. */
  hint?: string
  /** Validation message. Marks the control invalid and describes it with the text. */
  error?: string
  /** Starting choice, such as the value echoed back after a failed submission. */
  defaultValue?: string
  required?: boolean
}

/**
 * The `FormField` counterpart for choosing one option from a long list. It uses the site's shared
 * dropdown, which stays inside the viewport and opens upwards when there is no room below, instead
 * of a native `<select>`, whose list the browser may run off the screen. The choice is submitted
 * through a hidden input, so the field works in a plain `<form>` posted to a Server Action, and the
 * trigger carries the same label, `aria-required`, `aria-invalid` and description wiring as
 * `FormField`'s controls.
 */
export function SelectField({
  name,
  label,
  options,
  placeholder,
  hint,
  error,
  defaultValue = '',
  required = false,
}: SelectFieldProps) {
  const id = useId()
  const controlId = `${id}-${name}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const [value, setValue] = useState(defaultValue)
  // A new echoed value after a submission replaces whatever the control held.
  const [echoed, setEchoed] = useState(defaultValue)
  if (echoed !== defaultValue) {
    setEchoed(defaultValue)
    setValue(defaultValue)
  }

  return (
    <div className="form-field">
      <label htmlFor={controlId}>{label}</label>
      <Select
        describedBy={describedBy}
        id={controlId}
        invalid={Boolean(error)}
        label={label}
        onChange={setValue}
        options={options}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      <input name={name} type="hidden" value={value} />
      {hint ? (
        <p className="form-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="form-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
