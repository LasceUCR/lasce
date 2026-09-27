/**
 * Every string the public footer shows. Edit here, not in `PublicFooter.tsx`.
 *
 * The institution links and the copyright wording were confirmed for LASCE-PUB-012. The LASCE
 * full name follows the approved "Nosotros" copy in `app/lib/nosotros.ts`; `app/layout.tsx`
 * metadata still expands it as "Laboratorio de Ciencias Espaciales" and is out of scope here.
 */
export interface FooterInstitution {
  /** Visible text, for example `CINESPA`. */
  label: string
  /** Full name, exposed as an `<abbr>` tooltip when the label is an abbreviation. */
  name?: string
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
  /** Names shown beside the logo, in order. */
  institutions: readonly FooterInstitution[]
  institutionsLabel: string
  location: string
  navigationLabel: string
  links: readonly FooterLink[]
  copyright: { holder: string; notice: string }
}

export const footerContent: PublicFooterContent = {
  institutions: [
    { label: 'Universidad de Costa Rica', href: 'https://www.ucr.ac.cr/' },
    {
      label: 'CINESPA',
      name: 'Centro de Investigaciones Espaciales',
      href: 'https://cinespa.ucr.ac.cr/',
    },
    { label: 'LASCE', name: 'Laboratorio de Astrofísica Solar y Clima Espacial' },
  ],
  institutionsLabel: 'Instituciones',
  location: 'San Pedro de Montes de Oca',
  navigationLabel: 'Enlaces del pie de página',
  links: [
    { label: 'Contacto', href: '/contacto' },
    { label: 'Instagram', href: 'https://www.instagram.com/lasce_ucr/', external: true },
  ],
  copyright: { holder: 'Universidad de Costa Rica', notice: 'Todos los derechos reservados.' },
}
