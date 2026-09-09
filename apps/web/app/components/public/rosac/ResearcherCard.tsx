import Image from 'next/image'

export interface ResearcherCardProps {
  /** Local path under `apps/web/public`. */
  src: string
  name: string
  role: string
  institution: string
  description: string
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
  return (
    <article className="surface-card researcher-card">
      <div className="researcher-card-photo">
        <Image alt="" fill sizes="(max-width: 760px) 86vw, 440px" src={src} />
      </div>
      <div className="researcher-card-body">
        <p className="researcher-card-role">{role}</p>
        <h3 className="researcher-card-name">{name}</h3>
        {email ? (
          <a className="researcher-card-email" href={`mailto:${email}`}>
            {email}
          </a>
        ) : (
          <span aria-hidden="true" className="researcher-card-email researcher-card-email-empty" />
        )}
        <p className="researcher-card-institution">Institución: {institution}</p>
        <p className="researcher-card-description">{description}</p>
      </div>
    </article>
  )
}
