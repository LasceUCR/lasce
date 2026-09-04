import type { ReactNode } from 'react'

import { PublicFooter } from '@/app/components/public/PublicFooter'
import { PublicHeader } from '@/app/components/public/PublicHeader'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <PublicHeader />
      <main className="public-shell-content" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
