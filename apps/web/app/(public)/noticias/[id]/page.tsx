import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { NewsArticlePage } from '@/app/components/public/news/NewsArticlePage'
import { getNewsById } from '@/app/lib/news'

interface NewsArticleRouteProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: NewsArticleRouteProps): Promise<Metadata> {
  const { id } = await params
  const article = await getNewsById(id)

  if (!article) {
    return {}
  }

  const t = await getTranslations('news.page')

  return {
    title: t('metaTitle', { title: article.title }),
    description: article.abstract,
  }
}

export default async function NewsArticleRoute({ params }: NewsArticleRouteProps) {
  const { id } = await params
  const article = await getNewsById(id)

  if (!article) {
    notFound()
  }

  return <NewsArticlePage article={article} />
}
