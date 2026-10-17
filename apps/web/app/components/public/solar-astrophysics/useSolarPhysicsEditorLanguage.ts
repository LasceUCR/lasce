'use client'

import { useLocale, useMessages } from 'next-intl'
import { useMemo } from 'react'

import { editorLanguage, type EditorLanguage } from '@/app/lib/solar-physics-section-form'

/**
 * The section editor's language: the site's, from the header's selector. Its save errors come
 * from the `solarPhysics.saveErrors` namespace of the message catalogue.
 */
export function useSolarPhysicsEditorLanguage(): EditorLanguage {
  const uiLocale = useLocale()
  const { solarPhysics } = useMessages()

  return useMemo(() => editorLanguage(uiLocale, solarPhysics.saveErrors), [uiLocale, solarPhysics])
}
