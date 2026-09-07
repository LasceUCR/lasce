import { Flag } from 'lucide-react'

export interface ContentFlagProps {
  label: string
  message: string
}

export function ContentFlag({ label, message }: ContentFlagProps) {
  return (
    <aside aria-label={label} className="content-flag">
      <span className="content-flag-mark">
        <Flag aria-hidden="true" size={16} strokeWidth={2} />
        {label}
      </span>
      <p>{message}</p>
    </aside>
  )
}
