import Link from 'next/link'

import { Brand } from './Brand'

export function PublicFooter() {
  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-inner page-width">
        <div className="footer-identity">
          <Brand light />
          <div>
            <strong>Universidad de Costa Rica · LASCE</strong>
            <span>San Pedro de Montes de Oca</span>
          </div>
        </div>
        <nav className="footer-links" aria-label="Enlaces del pie de página">
          <Link href="/contacto">Contacto</Link>
          <a href="https://www.instagram.com/lasce_ucr/" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </nav>
      </div>
    </footer>
  )
}
