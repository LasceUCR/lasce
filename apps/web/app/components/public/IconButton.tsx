import type { ReactNode } from 'react'

export type IconButtonVariant = 'default' | 'danger'

export interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  variant?: IconButtonVariant
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  className,
  type = 'button',
  disabled,
}: IconButtonProps) {
  const classes = ['icon-button', variant === 'danger' && 'icon-button-danger', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      aria-label={label}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}
