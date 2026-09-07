export interface InputTimeFieldProps {
  className?: string
  type?: 'date' | 'time'
  disabled?: boolean
  label?: string
  id?: string
}

export function InputTimeField({ className, type, disabled, label, id }: InputTimeFieldProps) {
  const classes = ['input', `input-${type}`, className].filter(Boolean).join(' ')

  if (label && id) {
    return (
      <div>
        <label htmlFor={id}> {label} </label>
        <input className={classes} disabled={disabled} type={type} id={id} />
      </div>
    )
  }

  return <input className={classes} disabled={disabled} type={type} id={id} />
}
