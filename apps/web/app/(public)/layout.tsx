import type { ReactNode } from 'react'

import { PublicFooter } from '@/app/components/public/PublicFooter'
import { PublicHeader } from '@/app/components/public/PublicHeader'
import { SkipLink } from '@/app/components/public/SkipLink'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <SkipLink />
      <PublicHeader />
      <main className="public-shell-content" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
