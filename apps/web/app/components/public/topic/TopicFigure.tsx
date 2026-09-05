import Image from 'next/image'

export interface TopicFigureProps {
  src: string
  alt: string
  caption?: string
  priority?: boolean
}

export function TopicFigure({ src, alt, caption, priority = false }: TopicFigureProps) {
  return (
    <figure className="topic-figure">
      <div className="topic-figure-frame">
        <Image
          alt={alt}
          className="topic-figure-image"
          fill
          priority={priority}
          sizes="(max-width: 760px) 100vw, 720px"
          src={src}
        />
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}
