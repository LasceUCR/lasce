import type { Metadata } from 'next'
import { getMessages, getTranslations } from 'next-intl/server'

import { TeamPage } from '@/app/components/public/team/TeamPage'
import { getTeamContent } from '@/app/lib/team'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('team.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/equipo-de-desarrollo' },
  }
}

export default async function TeamRoute() {
  return <TeamPage content={getTeamContent(await getMessages())} />
}
