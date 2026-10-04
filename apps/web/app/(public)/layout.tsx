import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { logoutUser } from '@/app/(public)/cuenta/actions'
import { PublicFooter } from '@/app/components/public/PublicFooter'
import { PublicHeader } from '@/app/components/public/PublicHeader'
import { getFooterContent } from '@/app/lib/footer'
import { setLocale } from '@/app/lib/i18n/actions'

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('shell')
  const footerT = await getTranslations('footer')

  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        {t('skipToContent')}
      </a>
      <PublicHeader logoutAction={logoutUser} setLocaleAction={setLocale} />
      <main className="public-shell-content" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter content={getFooterContent((key) => footerT(key))} />
    </div>
  )
}
