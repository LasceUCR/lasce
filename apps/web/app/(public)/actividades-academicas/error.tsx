'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startTransition } from 'react'

import { AcademicActivitiesErrorState } from '@/app/components/public/news/AcademicActivitiesErrorState'

export interface AcademicActivitiesErrorProps {
  /** Next passes the thrown error; the message shown to visitors is fixed, not this one. */
  error: Error & { digest?: string }
  reset: () => void
}

export default function AcademicActivitiesError({ reset }: AcademicActivitiesErrorProps) {
  const router = useRouter()
  const t = useTranslations('academicActivities.listPage')

  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <AcademicActivitiesErrorState
      message={t('loadError')}
      onRetry={retry}
      retryLabel={t('retry')}
    />
  )
}
