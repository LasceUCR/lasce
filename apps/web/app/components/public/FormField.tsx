import { useEffect, useRef, useState, type ChangeEvent } from 'react'

/** How long the field must sit idle after a change before `validate` runs. */
const VALIDATION_DEBOUNCE_MS = 500

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'url' | 'date'
  multiline?: boolean
  /** Renders a `<select>` with one entry per option instead of an input. */
  options?: FormFieldOption[]
  placeholder?: string
  required?: boolean
  id?: string
  /**
   * Checks `value` once it's sat idle for `VALIDATION_DEBOUNCE_MS`, throwing
   * an `Error` whose `message` is shown below the field. Doesn't throw → no
   * error, and any previous one is cleared — debounced rather than checked on
   * every keystroke so a message raised while typing an invalid value clears
   * itself shortly after it becomes valid, instead of sitting there stale
   * until the field is blurred again.
   */
  validate?: (value: string) => void
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  options,
  placeholder,
  required,
  id,
  validate,
}: FormFieldProps) {
  const [error, setError] = useState<string | null>(null)
  // The value at mount, so the effect below can tell "still the pristine
  // value" from "the person changed it" with a plain comparison rather than a
  // flag it flips on its first run. A flag mutated inside the effect body is
  // not safe here: React (Strict Mode, in development) deliberately runs a
  // fresh mount's effect twice, and the second run would see the flag already
  // flipped by the first and validate the untouched initial value right away
  // — which is exactly what surfaced as an error appearing as soon as the
  // modal opened, before anyone had typed anything.
  const initialValueRef = useRef(value)
  // A caller typically passes an inline function (e.g. a fresh closure built
  // on every render), so `validate` itself is not a stable dependency — held
  // in a ref instead, read at the moment the debounce fires. Depending on it
  // directly would re-run this effect (and so re-validate a field the person
  // has not touched) whenever any sibling field's own change re-renders the
  // parent form and hands this field a new-but-equivalent function.
  const validateRef = useRef(validate)
  validateRef.current = validate

  useEffect(() => {
    if (value === initialValueRef.current) return

    const timeout = setTimeout(() => {
      if (!validateRef.current) return
      try {
        validateRef.current(value)
        setError(null)
      } catch (thrown) {
        setError(thrown instanceof Error ? thrown.message : String(thrown))
      }
    }, VALIDATION_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [value])

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    onChange(event.target.value)
  }

  const invalid = error !== null

  return (
    <label className="cms-form-field" htmlFor={id}>
      <span className="cms-form-field-label">
        {label}
        {required ? (
          <span aria-hidden="true" className="cms-form-field-required">
            {' '}
            *
          </span>
        ) : null}
      </span>
      {options ? (
        <select
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          id={id}
          onChange={handleChange}
          required={required}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          id={id}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          value={value}
        />
      ) : (
        <input
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          id={id}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      )}
      {error ? <p className="form-field-error">{error}</p> : null}
    </label>
  )
}
