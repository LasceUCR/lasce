'use client'

import { PageErrorState } from '@/app/components/public/PageErrorState'

export interface PublicErrorProps {
  /** Next passes the thrown error; the message shown to visitors is fixed, not this one. */
  error: Error & { digest?: string }
  reset: () => void
}

// Catches a public page that throws while rendering and has no `error.tsx` of its own, so a
// failed navigation shows an error with a retry instead of a frozen page (#475). It sits inside
// `(public)/layout.tsx`, so the header and footer stay usable.
export default function PublicError({ reset }: PublicErrorProps) {
  return <PageErrorState onRetry={reset} />
}
