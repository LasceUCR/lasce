/**
 * Every string the public footer shows. Edit here, not in `PublicFooter.tsx`.
 *
 * The institution links and the copyright wording were confirmed for LASCE-PUB-012. The LASCE
 * full name follows the approved "Nosotros" copy in `app/lib/nosotros.ts`; `app/layout.tsx`
 * metadata still expands it as "Laboratorio de Ciencias Espaciales" and is out of scope here.
 */
export interface FooterInstitution {
  /** Visible text, for example `UCR`. */
  abbreviation: string
  /** Full name, exposed as the `<abbr>` tooltip. */
  name: string
  /** Official website. Omit to render plain text: LASCE is this portal. */
  href?: string
}

export interface FooterLink {
  label: string
  href: string
  /** Opens in a new tab with `rel="noreferrer"`. */
  external?: boolean
}

export interface PublicFooterContent {
  identity: { title: string; location: string }
  navigationLabel: string
  links: readonly FooterLink[]
  copyright: { holder: string; notice: string }
  institutionsLabel: string
  institutions: readonly FooterInstitution[]
}

export const footerContent: PublicFooterContent = {
  identity: { title: 'Universidad de Costa Rica · LASCE', location: 'San Pedro de Montes de Oca' },
  navigationLabel: 'Enlaces del pie de página',
  links: [
    { label: 'Contacto', href: '/contacto' },
    { label: 'Instagram', href: 'https://www.instagram.com/lasce_ucr/', external: true },
  ],
  copyright: { holder: 'Universidad de Costa Rica', notice: 'Todos los derechos reservados.' },
  institutionsLabel: 'Instituciones',
  institutions: [
    { abbreviation: 'UCR', name: 'Universidad de Costa Rica', href: 'https://www.ucr.ac.cr/' },
    {
      abbreviation: 'CINESPA',
      name: 'Centro de Investigaciones Espaciales',
      href: 'https://cinespa.ucr.ac.cr/',
    },
    { abbreviation: 'LASCE', name: 'Laboratorio de Astrofísica Solar y Clima Espacial' },
  ],
}
