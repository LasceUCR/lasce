import { useId } from 'react'

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormFieldProps {
  /** Submitted field name; also keys the generated ids. */
  name: string
  label: string
  /** Rendered as an `<input>` of this type unless `options` is given. */
  type?: 'text' | 'email' | 'password'
  /** When present, the control is a `<select>` with one entry per option. */
  options?: FormFieldOption[]
  /** Input placeholder, or the text of the select's empty first option. */
  placeholder?: string
  /** Short guidance shown under the control and read as part of its description. */
  hint?: string
  /** Validation message. Marks the control invalid and describes it with the text. */
  error?: string
  defaultValue?: string
  autoComplete?: string
  required?: boolean
}

/**
 * A labelled form control with the accessibility wiring a validated form
 * needs: the label targets the control, `aria-required` says it is mandatory,
 * and an error makes the control `aria-invalid` and described by the message.
 * Required fields carry no asterisk; the form states the rule once instead.
 */
export function FormField({
  name,
  label,
  type = 'text',
  options,
  placeholder,
  hint,
  error,
  defaultValue,
  autoComplete,
  required = false,
}: FormFieldProps) {
  const id = useId()
  const controlId = `${id}-${name}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const shared = {
    id: controlId,
    name,
    autoComplete,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  return (
    <div className="form-field">
      <label htmlFor={controlId}>{label}</label>
      {options ? (
        <select {...shared} defaultValue={defaultValue ?? ''}>
          <option value="">{placeholder ?? 'Selecciona una opción'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} defaultValue={defaultValue} placeholder={placeholder} type={type} />
      )}
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
