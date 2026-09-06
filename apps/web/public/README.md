# Static assets

Files in this directory are served by Next.js from the site root.

- `brand/`: logos, wordmarks, favicons, and other brand-owned assets.
- `images/decorative/`: decorative backgrounds, textures, and illustrations.
- `images/equipo/`: team portraits for the _Quiénes somos_ gallery, cropped to 4:5. Each file is referenced from `app/lib/nosotros.ts`; the person's name is rendered as a visible caption, so the images carry empty alternative text.

For example, `public/brand/logo.svg` is available to the app as `/brand/logo.svg`.
