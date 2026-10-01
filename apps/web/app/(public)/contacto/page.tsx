import type { Metadata } from 'next'

import { ContactPage } from '@/app/components/public/contact/ContactPage'
import { contactContent, contactMeta } from '@/app/lib/contact'

export const metadata: Metadata = {
  ...contactMeta,
  alternates: { canonical: '/contacto' },
}

export default function ContactRoute() {
  return <ContactPage content={contactContent} />
}
