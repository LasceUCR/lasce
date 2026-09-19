# Static assets

Files in this directory are served by Next.js from the site root.

- `brand/`: logos, wordmarks, favicons, and other brand-owned assets.
- `images/decorative/`: decorative backgrounds, textures, and illustrations.
- `images/galeria/`: placeholder photography for the public gallery. Temporary, and
  documented in that directory's own README.
- `images/ROSAC/`: ROSAC brand assets for `/radioastronomia`. Wordmarks live in `images/ROSAC/logo/` (`ROSAC-YELLOW.png` is `hero.image` in `app/lib/rosac.ts`). Researcher portraits live in `images/ROSAC/team/` (`team.people[].src`) and are rendered by `ResearcherCard`; the person's name, role, email and institution are visible text on the front of the card, so the images carry empty alternative text.

For example, `public/brand/logo.svg` is available to the app as `/brand/logo.svg`.
