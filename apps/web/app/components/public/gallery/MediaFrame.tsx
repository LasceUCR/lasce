import Image from 'next/image'

export interface MediaFrameProps {
  /** Omitted while an album still has no contributed files. */
  src?: string
  alt: string
  /** Caption shown in place of the image when `src` is missing. */
  placeholder: string
  className?: string
  sizes?: string
}

/**
 * The framed image area shared by album tiles, media tiles and the lightbox.
 * Falls back to a labelled placeholder block so a gallery without photographs
 * still reads correctly instead of showing a broken image.
 */
export function MediaFrame({
  src,
  alt,
  placeholder,
  className,
  sizes = '(max-width: 760px) 100vw, 33vw',
}: MediaFrameProps) {
  const classes = ['media-frame', className].filter(Boolean).join(' ')

  if (!src) {
    return (
      <div className={`${classes} media-frame-empty`}>
        <span className="media-frame-label">{placeholder}</span>
      </div>
    )
  }

  return (
    <div className={classes}>
      <Image alt={alt} className="media-frame-image" fill sizes={sizes} src={src} />
    </div>
  )
}
