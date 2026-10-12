'use client'

import { useLocale, useMessages } from 'next-intl'
import { useMemo } from 'react'

import { editorLanguage, type EditorLanguage } from '@/app/lib/publication-form'

/**
 * The publication editor's language: the site's, from the header's selector. Its rules' messages
 * and its save errors come from the `publications` namespace of the message catalogue.
 */
export function usePublicationEditorLanguage(): EditorLanguage {
  const uiLocale = useLocale()
  const { publications } = useMessages()

  return useMemo(() => editorLanguage(uiLocale, publications), [uiLocale, publications])
}
