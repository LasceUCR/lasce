'use client'

import { ArrowRight, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import type { InstrumentCardLabels, RosacInstrumentCardContent } from '@/app/lib/rosac-instruments'

import styles from './InstrumentCard.module.css'

export interface InstrumentCardProps {
  instrument: RosacInstrumentCardContent
}

interface InstrumentImageProps {
  image?: RosacInstrumentCardContent['image']
  labels?: InstrumentCardLabels
}

function InstrumentImage({ image, labels }: InstrumentImageProps) {
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
          <span>
            {failed
              ? (labels?.imageUnavailable ?? 'Imagen no disponible')
              : (labels?.imagePending ?? 'Imagen pendiente')}
          </span>
        </div>
      )}
    </div>
  )
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  const titleId = useId()
  const labels = instrument.labels

  return (
    <article aria-labelledby={titleId} className={styles.card}>
      <InstrumentImage key={instrument.image?.src} image={instrument.image} labels={labels} />
      <div className={styles.content}>
        <h3 id={titleId}>{instrument.name}</h3>
        {instrument.pendingMessage && !instrument.consultation?.notice ? (
          <p className={styles.pending}>{instrument.pendingMessage}</p>
        ) : null}
        <dl className={styles.details}>
          {instrument.purpose ? (
            <div>
              <dt>{labels?.purpose ?? 'Propósito'}</dt>
              <dd>{instrument.purpose}</dd>
            </div>
          ) : null}
          {instrument.characteristics?.length ? (
            <div>
              <dt>{labels?.characteristics ?? 'Características'}</dt>
              <dd>
                <ul>
                  {instrument.characteristics.map((characteristic, index) => (
                    <li key={`${index}-${characteristic}`}>{characteristic}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {instrument.citation ? (
            <div>
              <dt>{labels?.citation ?? 'Cómo citar'}</dt>
              <dd>{instrument.citation}</dd>
            </div>
          ) : null}
        </dl>
        {instrument.consultation ? (
          <div className={styles.consultation}>
            {instrument.consultation.notice ? <p>{instrument.consultation.notice}</p> : null}
            {/* Without a destination the action stays visible but disabled, so every card keeps
                the same button in the same place. The pending message explains why. */}
            <Button
              disabled={!instrument.consultation.href}
              fullPageLoad
              href={instrument.consultation.href}
              icon={<ArrowRight aria-hidden="true" size={18} />}
              variant="primary"
            >
              <span>{instrument.consultation.label}</span>
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
