import type { ChangeEvent } from 'react'

export interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'url' | 'date'
  multiline?: boolean
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
  placeholder,
  required,
  id,
}: FormFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(event.target.value)
  }

  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field-label">{label}</span>
      {multiline ? (
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
