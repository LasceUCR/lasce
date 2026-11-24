import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { PASSWORD_REQUIREMENTS, passwordRequirements } from '@/app/lib/auth/password-rules'

export interface PasswordRequirementsProps {
  /** The password being typed. Each requirement is checked against it on every render. */
  password: string
}

/**
 * The requirements a new password must meet, listed under the password field and ticked off
 * while the visitor types. It reads the same `passwordRequirements` the server schema applies,
 * so a fully ticked list is a password the server accepts.
 *
 * A met requirement differs by its icon and a visually hidden "Cumplido:" prefix, not by colour
 * alone. The list is a polite live region, and each item is keyed by its state, so a change
 * replaces the item and a screen reader announces only that item, prefix included.
 */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const t = useTranslations('auth.passwordRequirements')
  const titleId = useId()
  const met = passwordRequirements(password)

  return (
    <div className="password-requirements">
      <p className="password-requirements-title" id={titleId}>
        {t('title')}
      </p>
      <ul aria-labelledby={titleId} aria-live="polite" className="password-requirements-list">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const isMet = met[requirement]
          return (
            <li
              className={isMet ? 'password-requirement is-met' : 'password-requirement'}
              key={`${requirement}-${isMet ? 'met' : 'unmet'}`}
            >
              <span aria-hidden="true" className="password-requirement-icon">
                {isMet ? '✓' : '○'}
              </span>
              <span className="sr-only">{`${isMet ? t('met') : t('unmet')} `}</span>
              <span>{t(`items.${requirement}`)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
