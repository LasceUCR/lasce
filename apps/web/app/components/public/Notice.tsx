import type { ReactNode } from 'react'

export interface NoticeProps {
  children: ReactNode
  tone?: 'info' | 'warning' | 'error'
  role?: 'note' | 'status' | 'alert'
  id?: string
}

/** Shared inline feedback; callers choose whether an update should be announced. */
export function Notice({ children, tone = 'info', role = 'note', id }: NoticeProps) {
  return (
    <p className={`ui-notice ui-notice-${tone}`} id={id} role={role}>
      {children}
    </p>
  )
}
