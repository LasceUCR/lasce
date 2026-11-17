# Development team page

`/equipo-de-desarrollo` credits the students who built the portal and explains the project's
background (US-471). It is public, static and not editable in "Modo edición".

| Piece      | Where                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Route      | `apps/web/app/(public)/equipo-de-desarrollo/page.tsx`                  |
| Component  | `apps/web/app/components/public/team/TeamPage.tsx`                     |
| Members    | `teamMembers` in `apps/web/app/lib/team.ts` (names and emails)         |
| Copy       | `team` namespace of `apps/web/messages/{es,en}.json`                   |
| Entry link | `footer.team` in the catalogues, wired in `apps/web/app/lib/footer.ts` |

To add or remove a person, edit `teamMembers`. To change the background text, edit the `team`
namespace in **both** catalogues. The page is also listed in `publicPaths` (`app/lib/site.ts`) so
it appears in the sitemap.

The background is based on the CI-0156 _Práctica Supervisada_ syllabus (II-2026). The copy still
needs approval from the project representatives before release; per-member contributions and
photographs were not provided and are not shown.
