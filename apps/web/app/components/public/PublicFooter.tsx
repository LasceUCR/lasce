import Link from 'next/link'

import type { PublicFooterContent } from '@/app/lib/footer'

import { Brand } from './Brand'

export interface PublicFooterProps {
  /** Every string the footer shows. Edit `app/lib/footer.ts`, not this file. */
  content: PublicFooterContent
  /**
   * Year shown in the copyright line. Defaults to the year at render time, which is per request
   * on `force-dynamic` routes and build time on prerendered ones (`/`, `/contacto`, the work
   * areas and the gallery). That is acceptable because every merge to `main` redeploys. If
   * `cacheComponents` is ever enabled, this default has to move behind `connection()` or
   * `'use cache'`.
   */
  year?: number
}

export function PublicFooter({ content, year = new Date().getFullYear() }: PublicFooterProps) {
  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-inner page-width">
        <div className="footer-identity">
          <Brand light />
          <div>
            <strong>{content.identity.title}</strong>
            <span>{content.identity.location}</span>
          </div>
        </div>
        <nav className="footer-links" aria-label={content.navigationLabel}>
          {content.links.map((link) =>
            link.external ? (
              <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="footer-legal page-width">
        <p className="footer-copyright">
          {`© ${year} ${content.copyright.holder}. ${content.copyright.notice}`}
        </p>
        <ul className="footer-institutions" aria-label={content.institutionsLabel}>
          {content.institutions.map((institution) => {
            const label = <abbr title={institution.name}>{institution.abbreviation}</abbr>

            return (
              <li key={institution.abbreviation}>
                {institution.href ? (
                  <a href={institution.href} rel="noreferrer" target="_blank">
                    {label}
                  </a>
                ) : (
                  label
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </footer>
  )
}
