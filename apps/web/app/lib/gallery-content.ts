/**
 * The public gallery's own fixed copy: not database content, and not dependent on anything that
 * needs a database connection. Kept apart from `gallery.ts`, which imports `@lasce/db` at module
 * scope, so a caller that only needs this copy — `GalleryPageSkeleton.tsx`, shown before any
 * database read has resolved — does not pull Prisma in along with it. `gallery.ts` re-exports
 * both for every other caller.
 */

export const galeriaMeta = {
  title: 'Galería | LASCE',
  description:
    'Fotografías y video de las actividades del Laboratorio de Ciencias Espaciales: construcción e instrumentación, observación y vida cotidiana del equipo.',
} as const

export const galeriaHero = {
  kicker: 'Portal público LASCE',
  title: 'Galería',
  lead: 'Fotografías y video de las actividades del laboratorio: construcción e instrumentación, observación y vida cotidiana del equipo. Organizada por álbumes.',
} as const
