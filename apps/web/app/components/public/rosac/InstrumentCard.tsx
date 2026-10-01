'use client'

import { ArrowRight, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import type { RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'

import styles from './InstrumentCard.module.css'

export interface InstrumentCardProps {
  instrument: RosacInstrumentCardContent
}

interface InstrumentImageProps {
  image?: RosacInstrumentCardContent['image']
}

function InstrumentImage({ image }: InstrumentImageProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={styles.image}>
      {image?.src && !failed ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={styles.placeholder}>
          <ImageIcon aria-hidden="true" size={36} strokeWidth={1.2} />
          <span>{failed ? 'Imagen no disponible' : 'Imagen pendiente'}</span>
        </div>
      )}
    </div>
  )
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  const titleId = useId()

  return (
    <article aria-labelledby={titleId} className={styles.card}>
      <InstrumentImage key={instrument.image?.src} image={instrument.image} />
      <div className={styles.content}>
        <h3 id={titleId}>{instrument.name}</h3>
        {instrument.pendingMessage ? (
          <p className={styles.pending}>{instrument.pendingMessage}</p>
        ) : null}
        <dl className={styles.details}>
          {instrument.purpose ? (
            <div>
              <dt>Propósito</dt>
              <dd>{instrument.purpose}</dd>
            </div>
          ) : null}
          {instrument.characteristics?.length ? (
            <div>
              <dt>Características</dt>
              <dd>
                <ul>
                  {instrument.characteristics.map((characteristic) => (
                    <li key={characteristic}>{characteristic}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {instrument.citation ? (
            <div>
              <dt>Cómo citar</dt>
              <dd>{instrument.citation}</dd>
            </div>
          ) : null}
        </dl>
        {instrument.consultation ? (
          <div className={styles.consultation}>
            <p>{instrument.consultation.notice}</p>
            <Button
              href={instrument.consultation.href}
              fullPageLoad
              variant="primary"
              icon={<ArrowRight aria-hidden="true" size={18} />}
            >
              {instrument.consultation.label}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
