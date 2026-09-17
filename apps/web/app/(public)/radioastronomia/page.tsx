import type { Metadata } from 'next'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { getResearchers, rosacInfoContent, rosacInfoMeta } from '@/app/lib/rosac'
import { workAreaPath } from '@/app/lib/work-areas'

export const metadata: Metadata = {
  ...rosacInfoMeta,
  alternates: { canonical: workAreaPath('radioastronomia') },
}

export const dynamic = 'force-dynamic'

export default async function RadioastronomiaRoute() {
  const people = await getResearchers()

  return (
    <RosacInfoPage
      content={{
        ...rosacInfoContent,
        team: { ...rosacInfoContent.team, people },
      }}
    />
  )
}
