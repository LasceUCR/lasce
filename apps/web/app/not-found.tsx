import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NotFoundPage } from '@/app/components/public/NotFoundPage'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound')
  return { title: t('metaTitle') }
}

export default function NotFound() {
  return <NotFoundPage />
}
