export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, id, disabled }: ToggleProps) {
  return (
    <label className="toggle" htmlFor={id}>
      <span className="toggle-label">{label}</span>
      <button
        aria-checked={checked}
        aria-label={label}
        className={['toggle-track', checked && 'toggle-track-on'].filter(Boolean).join(' ')}
        disabled={disabled}
        id={id}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  )
}
