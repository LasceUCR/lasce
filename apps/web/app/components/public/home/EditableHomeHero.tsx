'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  buildHeroRequest,
  heroInitial,
  jsonRequest,
  type HeroFormInitial,
} from '@/app/lib/home-form'
import type { HeroField, HeroReviewConfirmation, HomeHeroData } from '@/app/lib/home-schema'
import type { ContentDraft } from '@/app/lib/i18n/content/form'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'

import { HomeHero } from './HomeHero'
import { HomeHeroForm, type HomeHeroFormHandle } from './HomeHeroForm'

export interface EditableHomeHeroProps {
  hero: HomeHeroData
  canEdit?: boolean
}

/**
 * The one piece that knows both the banner's data and "Modo edición". With edit mode off, or for
 * someone who cannot edit, it is the plain `HomeHero`. Otherwise it offers to edit the title and
 * subtitle in both languages; there is nothing to add or delete.
 */
export function EditableHomeHero({ hero, canEdit = false }: EditableHomeHeroProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const t = useTranslations('home')
  const sendWithFeedback = useRequestFeedback()
  const form = useRef<HomeHeroFormHandle>(null)
  // One save at a time: a second click while the first is in flight would send the same version
  // again and come back as a false conflict.
  const saving = useRef(false)

  // Taken when the editor opens, so a refresh behind it cannot change what it saves against.
  const [initial, setInitial] = useState<HeroFormInitial | null>(null)

  const content = (
    <HomeHero
      contentLang={contentLangAttribute(hero.contentLocale)}
      lead={hero.lead}
      title={hero.title}
    />
  )

  const { editing } = hero
  if (!editMode || !canEdit || !editing) return content

  function close() {
    setInitial(null)
  }

  async function handleSave(draft: ContentDraft<HeroField>, confirmed: HeroReviewConfirmation[]) {
    if (!initial) return
    const body = buildHeroRequest(initial, draft, confirmed)
    if (!body) {
      close()
      return
    }

    if (saving.current) return
    saving.current = true
    await sendWithFeedback('/api/home/hero', jsonRequest('PATCH', body), {
      success: t('editor.heroUpdated'),
      fallback: t('saveErrors.heroFailed'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
    saving.current = false
  }

  const modal = (
    <Modal
      onClose={() => {
        if (form.current) form.current.requestCancel()
        else close()
      }}
      open={initial !== null}
      size="large"
      title={t('editor.heroEditTitle')}
    >
      {initial ? (
        <HomeHeroForm initial={initial} onCancel={close} onSave={handleSave} ref={form} />
      ) : null}
    </Modal>
  )

  return (
    <>
      <EditableWrapper
        className="home-hero-editable"
        editLabel={t('editor.heroEditLabel')}
        onEdit={() => setInitial(heroInitial(editing))}
      >
        {content}
      </EditableWrapper>
      {/* Outside the banner, whose `.hero p` and `h1` styles would otherwise reach the dialog. */}
      {initial ? createPortal(modal, document.body) : null}
    </>
  )
}
