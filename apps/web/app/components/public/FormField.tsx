import type { ChangeEvent } from 'react'

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
}: FormFieldProps) {
  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    onChange(event.target.value)
  }

  return (
    <label className="cms-form-field" htmlFor={id}>
      <span className="cms-form-field-label">{label}</span>
      {options ? (
        <select id={id} onChange={handleChange} required={required} value={value}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          id={id}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          value={value}
        />
      ) : (
        <input
          id={id}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
      )}
    </label>
  )
}