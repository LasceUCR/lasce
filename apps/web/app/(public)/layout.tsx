import type { ReactNode } from 'react'

import { PublicFooter } from '@/app/components/public/PublicFooter'
import { PublicHeader } from '@/app/components/public/PublicHeader'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <PublicHeader />
      <div className="public-shell-content">{children}</div>
      <PublicFooter />
    </div>
  )
}
