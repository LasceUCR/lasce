import type { Metadata } from 'next'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { getNosotrosActivities, nosotrosContent, nosotrosMeta } from '@/app/lib/nosotros'

export const metadata: Metadata = {
  ...nosotrosMeta,
  alternates: { canonical: '/nosotros' },
}

export const dynamic = 'force-dynamic'

export default async function NosotrosRoute() {
  const activities = await getNosotrosActivities()

  return (
    <NosotrosPage
      content={{
        ...nosotrosContent,
        activities: { title: nosotrosContent.activities.title, items: activities },
      }}
    />
  )
}
