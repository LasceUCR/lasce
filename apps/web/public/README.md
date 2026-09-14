# Static assets

Files in this directory are served by Next.js from the site root.

- `brand/`: logos, wordmarks, favicons, and other brand-owned assets.
- `images/decorative/`: decorative backgrounds, textures, and illustrations.
- `images/galeria/`: placeholder photography for the public gallery. Temporary, and
  documented in that directory's own README.
- `images/ROSAC/`: ROSAC wordmark used in the `/radioastronomia` hero (`ROSAC-AMARILLO.png`), referenced from `app/lib/rosac.ts` (`hero.image`).
- `images/equipo/`: ROSAC researcher portraits for the gallery on `/radioastronomia`. Each named file is referenced from `app/lib/rosac.ts` (`team.people[].src`) and rendered by `ResearcherCard`; the person's name, role, email, institution and description are visible text, so the images carry empty alternative text.

For example, `public/brand/logo.svg` is available to the app as `/brand/logo.svg`.
