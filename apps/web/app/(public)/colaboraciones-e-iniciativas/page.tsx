import type { Metadata } from 'next'

import { CollaborationsPage } from '@/app/components/public/collaborations/CollaborationsPage'
import { collaborationsContent, collaborationsMeta } from '@/app/lib/collaborations'
import { researchCollaborations } from '@/app/lib/research-collaborations'

export const metadata: Metadata = {
  ...collaborationsMeta,
  alternates: { canonical: '/colaboraciones-e-iniciativas' },
}

export default function CollaborationsRoute() {
  return (
    <CollaborationsPage collaborations={researchCollaborations} content={collaborationsContent} />
  )
}
