import { getTranslations } from 'next-intl/server'

import { PublicationsPageSkeleton } from '@/app/components/public/publications/PublicationsPageSkeleton'

export default async function Loading() {
  const [page, common] = await Promise.all([
    getTranslations('publications.page'),
    getTranslations('common'),
  ])

  return (
    <PublicationsPageSkeleton
      backLabel={common('backToHome')}
      kicker={page('kicker')}
      label={page('loading')}
      lead={page('lead')}
      listTitle={page('recent')}
      title={page('title')}
    />
  )
}
