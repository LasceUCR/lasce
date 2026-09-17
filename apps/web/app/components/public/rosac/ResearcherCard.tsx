'use client'

import Image from 'next/image'
import { useId, useLayoutEffect, useRef, useState, type WheelEvent } from 'react'

export interface ResearcherCardProps {
  /** Local path under `apps/web/public`. */
  src: string
  name: string
  role: string
  institution: string
  description?: string
  email?: string
}

/**
 * Presentational researcher portrait card. The photo is decorative (`alt=""`) because the name,
 * role, email and institution are real HTML. Named buttons flip the card so the mailto is never
 * nested inside a control. The hidden face is `inert` and `aria-hidden`, and the description is a
 * named region so overflow can be read from the keyboard.
 */
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

  function handleBackWheel(event: WheelEvent<HTMLButtonElement>) {
    descriptionScrollRef.current?.scrollBy({ top: event.deltaY })
  }

  const className = ['researcher-card', canFlip ? 'has-flip' : '', flipped ? 'is-flipped' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article className={className}>
      <div className="researcher-card-inner">
        <div
          aria-hidden={flipped || undefined}
          className="researcher-card-face researcher-card-front"
          inert={flipped ? true : undefined}
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
          <div className="researcher-card-photo">
            <Image alt="" fill sizes="(max-width: 760px) 86vw, 440px" src={src} />
          </div>
          <p className="researcher-card-role">{role}</p>
          <h3 className="researcher-card-name">{name}</h3>
          <div className="researcher-card-meta">
            {email ? (
              <a className="researcher-card-email" href={`mailto:${email}`}>
                {email}
              </a>
            ) : null}
            <p className="researcher-card-institution">Institución: {institution}</p>
          </div>
        </div>

        {canFlip ? (
          <div
            aria-hidden={flipped ? undefined : true}
            className="researcher-card-face researcher-card-back"
            inert={!flipped ? true : undefined}
          >
            <button
              aria-controls={descriptionId}
              aria-expanded={flipped}
              aria-label={`Volver a la ficha de ${name}`}
              className="researcher-card-flip-hit"
              onClick={toggleFlip}
              onWheel={handleBackWheel}
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
              role="region"
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
