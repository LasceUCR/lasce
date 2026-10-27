import type { CSSProperties } from 'react'

import styles from './Skeleton.module.css'

export type SkeletonShape = 'block' | 'text' | 'circle'

/** `light` on white surfaces; `dark` on the dark frames of solar images. */
export type SkeletonTone = 'light' | 'dark'

/** A CSS length. A number is read as pixels, as in React's `style`. */
export type SkeletonLength = number | string

export interface SkeletonProps {
  /** `block` (default) for media and boxes, `text` for a line of text, `circle` for avatars. */
  shape?: SkeletonShape
  tone?: SkeletonTone
  /** Defaults to the full width of its container. */
  width?: SkeletonLength
  /** Defaults to 1rem, or to the line height for `text`. Ignored when `aspectRatio` is set. */
  height?: SkeletonLength
  /** For media whose size is known by its proportions, such as `'1 / 1'` for a solar image. */
  aspectRatio?: string
  className?: string
}

/**
 * One placeholder shape, shown in place of content that is still loading. It is decorative: it
 * is hidden from assistive technology, has no role and cannot take focus. Wrap placeholders in
 * `LoadingRegion`, which marks the area busy and announces the loading state.
 *
 * The shimmer stops under `prefers-reduced-motion`.
 */
export function Skeleton({
  shape = 'block',
  tone = 'light',
  width,
  height,
  aspectRatio,
  className,
}: SkeletonProps) {
  const classes = [
    styles.skeleton,
    shape === 'text' ? styles.text : null,
    shape === 'circle' ? styles.circle : null,
    tone === 'dark' ? styles.dark : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const style: CSSProperties = {
    width,
    ...(aspectRatio ? { aspectRatio, height: 'auto' } : { height }),
  }

  return <span aria-hidden="true" className={classes} style={style} />
}

export interface SkeletonTextProps {
  /** How many lines the text usually takes. */
  lines?: number
  /** The last line is shorter, as text usually is. */
  lastLineWidth?: SkeletonLength
  tone?: SkeletonTone
  className?: string
}

/** A paragraph of `lines` lines of text, the last one shorter. */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  tone,
  className,
}: SkeletonTextProps) {
  const count = Math.max(1, Math.floor(lines))

  return (
    <span aria-hidden="true" className={className ? `${styles.lines} ${className}` : styles.lines}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          shape="text"
          tone={tone}
          width={index === count - 1 && count > 1 ? lastLineWidth : undefined}
        />
      ))}
    </span>
  )
}
