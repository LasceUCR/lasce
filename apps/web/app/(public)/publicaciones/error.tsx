'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startTransition } from 'react'

import { PublicationsErrorState } from '@/app/components/public/publications/PublicationsErrorState'

export interface PublicationsErrorProps {
  /** Next passes the thrown error; the message shown to visitors is fixed, not this one. */
  error: Error & { digest?: string }
  reset: () => void
}

// Catches a thrown `getPublicationsPage` (for example the database is unreachable). `reset()`
// alone re-renders the failed server result already in the browser, so the retry also asks Next
// to read the page from the server again.
export default function PublicationsError({ reset }: PublicationsErrorProps) {
  const router = useRouter()
  const t = useTranslations('publications.page')

  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return <PublicationsErrorState message={t('loadError')} onRetry={retry} retryLabel={t('retry')} />
}
