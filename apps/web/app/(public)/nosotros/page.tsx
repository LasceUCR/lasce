import type { Metadata } from 'next'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { userHasPermission } from '@/app/lib/auth/authorization'
import { getNosotrosActivities, nosotrosContent, nosotrosMeta } from '@/app/lib/nosotros'

export const metadata: Metadata = {
  ...nosotrosMeta,
  alternates: { canonical: '/nosotros' },
}

export const dynamic = 'force-dynamic'

export default async function NosotrosRoute() {
  const [activities, canCreate, canEdit, canDelete] = await Promise.all([
    getNosotrosActivities(),
    userHasPermission('create_components'),
    userHasPermission('edit_components'),
    userHasPermission('delete_components'),
  ])

  return (
    <NosotrosPage
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      content={{
        ...nosotrosContent,
        activities: { title: nosotrosContent.activities.title, items: activities },
      }}
    />
  )
}
