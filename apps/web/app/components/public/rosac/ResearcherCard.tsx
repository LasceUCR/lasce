'use client'

import Image from 'next/image'
import { useId, useLayoutEffect, useRef, useState } from 'react'

export interface ResearcherCardProps {
  /** Local path under `apps/web/public`. */
  src: string
  name: string
  role: string
  institution: string
  description?: string
  email?: string
}

export function ResearcherCard({
  src,
  name,
  role,
  institution,
  description,
  email,
}: ResearcherCardProps) {
  const [flipped, setFlipped] = useState(false)
  const canFlip = Boolean(description)
  const descriptionId = useId()
  const frontButtonRef = useRef<HTMLButtonElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const descriptionScrollRef = useRef<HTMLDivElement>(null)
  const skipFocusRef = useRef(true)

  useLayoutEffect(() => {
    if (skipFocusRef.current) {
      skipFocusRef.current = false
      return
    }

    if (flipped) {
      backButtonRef.current?.focus()
      return
    }

    frontButtonRef.current?.focus()
  }, [flipped])

  function toggleFlip() {
    if (!canFlip) {
      return
    }

    setFlipped((current) => !current)
  }

  const identity = (
    <>
      <div className="researcher-card-photo">
        <Image alt="" fill sizes="(max-width: 760px) 86vw, 440px" src={src} />
      </div>
      <p className="researcher-card-role">{role}</p>
      <h3 className="researcher-card-name">{name}</h3>
    </>
  )

  return (
    <article
      className={`researcher-card${canFlip ? ' has-flip' : ''}${flipped ? ' is-flipped' : ''}`}
    >
      <div className="researcher-card-inner">
        <div
          className="researcher-card-face researcher-card-front"
          {...(flipped ? { inert: true } : {})}
          aria-hidden={flipped || undefined}
        >
          {canFlip ? (
            <button
              aria-controls={descriptionId}
              aria-expanded={flipped}
              aria-label={`Ver descripción de ${name}`}
              className="researcher-card-flip-hit"
              onClick={toggleFlip}
              ref={frontButtonRef}
              type="button"
            />
          ) : null}
          {identity}
          {email ? (
            <a className="researcher-card-email" href={`mailto:${email}`}>
              {email}
            </a>
          ) : (
            <span aria-hidden="true" className="researcher-card-email researcher-card-email-empty" />
          )}
          <p className="researcher-card-institution">Institución: {institution}</p>
        </div>

        {canFlip ? (
          <div
            className="researcher-card-face researcher-card-back"
            {...(!flipped ? { inert: true } : {})}
            aria-hidden={flipped ? undefined : true}
            onClick={toggleFlip}
          >
            <button
              aria-expanded={flipped}
              aria-label={`Volver a la ficha de ${name}`}
              className="researcher-card-flip-hit"
              onClick={(event) => {
                event.stopPropagation()
                toggleFlip()
              }}
              onWheel={(event) => {
                descriptionScrollRef.current?.scrollBy({ top: event.deltaY })
              }}
              ref={backButtonRef}
              type="button"
            />
            <div className="researcher-card-back-header">
              <h3 className="researcher-card-name">{name}</h3>
              <p className="researcher-card-institution">Institución: {institution}</p>
            </div>
            <div
              aria-label={`Descripción de ${name}`}
              className="researcher-card-description-scroll"
              id={descriptionId}
              ref={descriptionScrollRef}
              tabIndex={flipped ? 0 : -1}
            >
              <p className="researcher-card-description">{description}</p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
