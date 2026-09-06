import type { Metadata } from 'next'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { rosacInfoContent, rosacInfoMeta } from '@/app/lib/rosac'
import { workAreaPath } from '@/app/lib/work-areas'

export const metadata: Metadata = {
  ...rosacInfoMeta,
  alternates: { canonical: workAreaPath('radioastronomia') },
}

export default function RadioastronomiaRoute() {
  return <RosacInfoPage content={rosacInfoContent} />
}
