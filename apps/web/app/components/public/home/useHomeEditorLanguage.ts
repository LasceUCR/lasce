'use client'

import { useLocale, useMessages } from 'next-intl'
import { useMemo } from 'react'

import { homeEditorLanguage, type HomeEditorLanguage } from '@/app/lib/home-form'

/**
 * The home page editors' language: the site's, from the header's selector. Their rules' messages
 * and save errors come from the `home` namespace of the message catalogue; the editor tabs only
 * pick which translation is being typed.
 */
export function useHomeEditorLanguage(): HomeEditorLanguage {
  const uiLocale = useLocale()
  const { home } = useMessages()

  return useMemo(() => homeEditorLanguage(uiLocale, home), [uiLocale, home])
}
