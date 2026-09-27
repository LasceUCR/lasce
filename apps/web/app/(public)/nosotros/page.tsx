import type { Metadata } from 'next'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import {
  getNosotrosActivities,
  getNosotrosResearchers,
  nosotrosContent,
  nosotrosMeta,
} from '@/app/lib/nosotros'
import { researchCollaborations } from '@/app/lib/research-collaborations'

export const metadata: Metadata = {
  ...nosotrosMeta,
  alternates: { canonical: '/nosotros' },
}

export const dynamic = 'force-dynamic'

export default async function NosotrosRoute() {
  const [activities, researchers, canCreate, canEdit, canDelete] = await Promise.all([
    getNosotrosActivities(),
    getNosotrosResearchers(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <NosotrosPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      collaborations={researchCollaborations}
      content={{
        ...nosotrosContent,
        activities: { title: nosotrosContent.activities.title, items: activities },
        researchers: { ...nosotrosContent.researchers, people: researchers },
      }}
    />
  )
}
