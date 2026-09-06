import type { Metadata } from 'next'

import { NosotrosPage } from '@/app/components/public/nosotros/NosotrosPage'
import { nosotrosContent, nosotrosMeta } from '@/app/lib/nosotros'

export const metadata: Metadata = {
  ...nosotrosMeta,
  alternates: { canonical: '/nosotros' },
}

export default function NosotrosRoute() {
  return <NosotrosPage content={nosotrosContent} />
}
