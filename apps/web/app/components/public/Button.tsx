import Link from 'next/link'
import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'brand'

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  href?: string
  /** Forwarded to the underlying anchor. Set to `_blank` for an external `href`. */
  target?: string
  /** Forwarded to the underlying anchor. Pair with `target="_blank"` on an external
   * `href` — `noopener noreferrer` prevents the opened page from reaching back into
   * this one through `window.opener`. */
  rel?: string
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
  target,
  rel,
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
      <Link className={classes} href={href} rel={rel} target={target}>
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
