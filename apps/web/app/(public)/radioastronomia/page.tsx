import type { Metadata } from 'next'

import { RosacInfoPage } from '@/app/components/public/rosac/RosacInfoPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getResearchers, rosacInfoContent, rosacInfoMeta } from '@/app/lib/rosac'
import { workAreaPath } from '@/app/lib/work-areas'

export const metadata: Metadata = {
  ...rosacInfoMeta,
  alternates: { canonical: workAreaPath('radioastronomia') },
}

export const dynamic = 'force-dynamic'

export default async function RadioastronomiaRoute() {
  const [people, canCreate, canEdit, canDelete] = await Promise.all([
    getResearchers(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <RosacInfoPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      content={{
        ...rosacInfoContent,
        team: { ...rosacInfoContent.team, people },
      }}
    />
  )
}
