import { Download, LogIn } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import type { DownloadFormat } from '@/app/lib/downloads/formats'
import type { DownloadOption } from '@/app/lib/downloads/policy'

export interface ResourceDownloadMessage {
  tone: 'info' | 'error'
  text: string
}

export interface ResourceDownloadActionsProps {
  /** What the product offers, from `getDownloadOptions`. Empty for products with no downloads. */
  options: DownloadOption[]
  /**
   * Signed-in users see only the formats they may download. Anonymous visitors see each graphic
   * format as a sign-in prompt; choosing it calls `onDownload`, which leads to sign-in.
   */
  signedIn: boolean
  /** The format being prepared, which disables every button until it finishes. */
  pendingFormat: DownloadFormat | null
  message: ResourceDownloadMessage | null
  onDownload: (format: DownloadFormat) => void
}

/** The download buttons under a `/datos` result. Renders nothing when there is nothing to offer. */
export function ResourceDownloadActions({
  options,
  signedIn,
  pendingFormat,
  message,
  onDownload,
}: ResourceDownloadActionsProps) {
  const visible = options.filter((option) =>
    signedIn ? option.allowed : option.kind === 'graphic',
  )
  if (!visible.length) return null

  return (
    <section aria-labelledby="scientific-downloads-title" className="data-downloads">
      <h3 id="scientific-downloads-title">Descargas</h3>
      <div className="data-downloads-actions">
        {visible.map((option) => (
          <Button
            disabled={pendingFormat !== null}
            icon={
              signedIn ? (
                <Download aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : (
                <LogIn aria-hidden="true" size={18} strokeWidth={1.8} />
              )
            }
            key={option.format}
            onClick={() => onDownload(option.format)}
          >
            {!signedIn
              ? 'Inicie sesión para descargar la gráfica'
              : pendingFormat === option.format
                ? 'Preparando descarga…'
                : option.label}
          </Button>
        ))}
      </div>
      {message ? (
        <Notice role={message.tone === 'error' ? 'alert' : 'status'} tone={message.tone}>
          {message.text}
        </Notice>
      ) : null}
    </section>
  )
}
