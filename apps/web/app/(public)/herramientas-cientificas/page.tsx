import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { ScientificToolsManager } from '@/app/components/public/scientific-tools/ScientificToolsManager'
import { TopicBackLink } from '@/app/components/public/topic/TopicBackLink'
import { TopicHero } from '@/app/components/public/topic/TopicHero'
import { TopicSection } from '@/app/components/public/topic/TopicSection'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { getScientificToolRecords, type ScientificTool } from '@/app/lib/scientific-tool-records'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('scientificTools')

  return {
    title: t('meta.title'),
    description: t('hero.intro'),
    alternates: { canonical: '/herramientas-cientificas' },
  }
}

// The tools are edited in Modo edición, so every request reads the current ones.
export const dynamic = 'force-dynamic'

/** A failed read shows the empty state instead of breaking the page. */
async function readTools(locale: string, includeEditingData: boolean): Promise<ScientificTool[]> {
  try {
    return await getScientificToolRecords(resolveLocale(locale), { includeEditingData })
  } catch (error) {
    console.error('Could not read the scientific tools.', error)
    return []
  }
}

export default async function ScientificToolsRoute() {
  const [t, common, locale, canCreate, canEdit, canDelete] = await Promise.all([
    getTranslations('scientificTools'),
    getTranslations('common'),
    getLocale(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])
  const tools = await readTools(locale, canEdit)

  return (
    <article className="topic-page">
      <TopicHero kicker={t('hero.kicker')} title={t('hero.title')} lead={t('hero.intro')} />
      <TopicSection title={t('list.title')}>
        <ScientificToolsManager
          tools={tools}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </TopicSection>
      <div className="topic-page-footer page-width">
        <TopicBackLink href="/" label={common('backToHome')} />
      </div>
    </article>
  )
}
