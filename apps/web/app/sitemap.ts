import type { MetadataRoute } from 'next'

import { getPublicPaths, siteUrl } from './lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getPublicPaths()

  return paths.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
