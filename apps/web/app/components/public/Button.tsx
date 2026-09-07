import Link from 'next/link'
import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary'

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  href?: string
  icon?: ReactNode
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}

export function Button({
  children,
  variant = 'primary',
  href,
  icon,
  className,
  type = 'button',
  disabled,
  onClick,
}: ButtonProps) {
  const classes = ['button', `button-${variant}`, className].filter(Boolean).join(' ')
  const content = (
    <>
      {icon}
      {children}
    </>
  )

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    )
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {content}
    </button>
  )
}
