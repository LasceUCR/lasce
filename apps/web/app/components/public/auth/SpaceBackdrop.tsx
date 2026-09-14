import Image from 'next/image'

/**
 * The starfield with the sun on the right that sits behind the access and
 * account pages. Decorative and out of the accessibility tree; the page that
 * uses it carries the `space-page` class, whose gradient keeps the intro and
 * tabs readable over the dark scene.
 */
export function SpaceBackdrop() {
  return (
    <div aria-hidden="true" className="space-page-bg">
      <Image alt="" fill priority sizes="100vw" src="/images/decorative/acceso-bg.jpg" />
    </div>
  )
}
