'use client'

import { useLocale, useMessages } from 'next-intl'
import { useMemo } from 'react'

import {
  researchAreaEditorLanguage,
  type ResearchAreaEditorLanguage,
} from '@/app/lib/research-area-form'

/**
 * The research area editor's language: the site's, from the header's selector. Its rules'
 * messages come from `researchAreas.validation`; the editor tabs only pick which translation is
 * being typed.
 */
export function useResearchAreaEditorLanguage(): ResearchAreaEditorLanguage {
  const uiLocale = useLocale()
  const { researchAreas } = useMessages()

  return useMemo(
    () => researchAreaEditorLanguage(uiLocale, researchAreas.validation),
    [uiLocale, researchAreas],
  )
}
