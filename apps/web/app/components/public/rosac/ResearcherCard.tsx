'use client'

import Image from 'next/image'
import { Fragment, useId, useLayoutEffect, useRef, useState, type WheelEvent } from 'react'

/** Front-of-card institution text. Longer affiliations end with `...` after this many characters. */
export const INSTITUTION_PREVIEW_LENGTH = 50

export function institutionPreview(institution: string): string {
  if (institution.length <= INSTITUTION_PREVIEW_LENGTH) {
    return institution
  }

  return `${institution.slice(0, INSTITUTION_PREVIEW_LENGTH)}...`
}

export interface ResearcherCardProps {
  /** Local path under `apps/web/public`. */
  src: string
  name: string
  role: string
  institution: string
  description?: string
  /** One address, or several when LASCE supplied more than one. */
  email?: string | readonly string[]
}

/**
 * Presentational researcher portrait card. The photo is decorative (`alt=""`) because the name,
 * role, email and institution are real HTML. Named buttons flip the card so the mailto is never
 * nested inside a control. A description, or an institution that does not fit on the front, opens
 * the back, where the affiliation is shown in full. The hidden face is `inert` and `aria-hidden`,
 * and the description is a named region so overflow can be read from the keyboard.
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
  const descriptionId = useId()
  const institutionId = useId()
  const institutionText = institutionPreview(institution)
  const canFlip = Boolean(description) || institutionText !== institution
  const detailsLabel = description ? `Ver descripción de ${name}` : `Ver institución de ${name}`
  const detailsId = description ? descriptionId : institutionId
  const frontButtonRef = useRef<HTMLButtonElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const descriptionScrollRef = useRef<HTMLDivElement>(null)
  const pendingFocusRef = useRef(false)

  useLayoutEffect(() => {
    if (!pendingFocusRef.current) {
      return
    }

    pendingFocusRef.current = false
    const target = flipped ? backButtonRef.current : frontButtonRef.current
    target?.focus({ preventScroll: true })
  }, [flipped])

  function toggleFlip() {
    if (!canFlip) {
      return
    }

    pendingFocusRef.current = true
    setFlipped((current) => !current)
  }

  function handleBackWheel(event: WheelEvent<HTMLButtonElement>) {
    descriptionScrollRef.current?.scrollBy({ top: event.deltaY })
  }

  const className = ['researcher-card', canFlip ? 'has-flip' : '', flipped ? 'is-flipped' : '']
    .filter(Boolean)
    .join(' ')
  const emails = typeof email === 'string' ? [email] : (email ?? [])

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
              aria-controls={detailsId}
              aria-expanded={flipped}
              aria-label={detailsLabel}
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
            {emails.length > 0 ? (
              <p className="researcher-card-emails">
                {emails.map((address, index) => (
                  <Fragment key={address}>
                    {index > 0 ? ', ' : null}
                    <a className="researcher-card-email" href={`mailto:${address}`}>
                      {address}
                    </a>
                  </Fragment>
                ))}
              </p>
            ) : null}
            <p className="researcher-card-institution">Institución: {institutionText}</p>
          </div>
        </div>

        {canFlip ? (
          <div
            aria-hidden={flipped ? undefined : true}
            className="researcher-card-face researcher-card-back"
            inert={!flipped ? true : undefined}
          >
            <button
              aria-controls={detailsId}
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
              <p
                className="researcher-card-institution"
                id={description ? undefined : institutionId}
              >
                Institución: {institution}
              </p>
            </div>
            {description ? (
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
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
