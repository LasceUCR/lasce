# @lasce/web

Public institutional portal for LASCE, built with Next.js and TypeScript inside the LASCE Turborepo.

The public pages are available without authentication. The header includes an **Ingresar** link to `/login`; the authentication flow and protected areas are implemented separately from this public portal.

## Requirements

- Node.js 22 or newer
- pnpm 10.34.5, managed through Corepack
- Chromium for the Playwright end-to-end tests

## Installation

Run these commands from the repository root:

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env
corepack pnpm db:generate
```

Review `.env` before starting the complete platform. The public portal can render without an authentication service, but other applications and API handlers in the repository may require the infrastructure variables defined in `.env.example`.

Set `NEXT_PUBLIC_APP_URL` to the public origin of the website. Local development uses:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Running the Portal

Start only the web application from the repository root:

```powershell
corepack pnpm --filter @lasce/web dev
```

The portal will be available at [http://localhost:3000](http://localhost:3000).

To run every development application configured in the Turborepo instead, use:

```powershell
corepack pnpm dev
```

For a production build:

```powershell
corepack pnpm --filter @lasce/web build
```

Production deployment uses the standalone Next.js bundle through
[`infra/docker/web.Dockerfile`](../../infra/docker/web.Dockerfile).

## Public Routes

| Route                | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `/`                  | Institutional landing page and access to the main public areas |
| `/#areas-de-trabajo` | Work areas and main portal access cards on the home page       |
| `/fisica-solar`      | Solar physics work area                                        |
| `/clima-espacial`    | Space weather work area                                        |
| `/radioastronomia`   | Radio astronomy work area                                      |
| `/nosotros`          | General information about LASCE                                |
| `/investigacion`     | Research areas and activities                                  |
| `/instrumentacion`   | Scientific instruments and observatories                       |
| `/datos`             | Public data and analysis resources                             |
| `/noticias`          | Institutional news                                             |
| `/contacto`          | Contact information                                            |

Unknown routes return the standard Next.js `404` response. Public routes do not redirect visitors to a login page.

## Work Areas

The three LASCE research work areas are defined once in `app/lib/work-areas.ts`. That module owns their slugs, titles, descriptions, icons, and route helpers. The home page renders every card through `WorkAreasSection`, using the shared `getHomeAreaCards()` helper.

| Slug              | Route              | Card on home    |
| ----------------- | ------------------ | --------------- |
| `fisica-solar`    | `/fisica-solar`    | Física solar    |
| `clima-espacial`  | `/clima-espacial`  | Clima espacial  |
| `radioastronomia` | `/radioastronomia` | Radioastronomía |

The home section anchor is `/#areas-de-trabajo`. The same module also lists the three portal access cards that link to existing top-level routes (`/instrumentacion`, `/datos`, `/noticias`).

Reusable UI for this section lives in `app/components/public/WorkAreaCard.tsx` and `WorkAreasSection.tsx`, with Storybook stories co-located beside each component.

## Shared Public Layout

The route group `app/(public)` organizes the public portal without adding a segment to its URLs. Its layout provides the shared skip link, header, main content region, and footer.

```text
app/
|-- (public)/
|   |-- [section]/page.tsx
|   |-- layout.tsx
|   `-- page.tsx
|-- components/public/
|   |-- Brand.tsx
|   |-- PublicFooter.tsx
|   |-- PublicHeader.tsx
|   |-- WorkAreaCard.tsx
|   `-- WorkAreasSection.tsx
|-- lib/
|   |-- site.ts
|   `-- work-areas.ts
|-- globals.css
|-- layout.tsx
|-- robots.ts
`-- sitemap.ts
tests/e2e/
|-- accessibility-seo.spec.ts
`-- public-portal.spec.ts
playwright.config.ts
```

- `app/(public)/layout.tsx` defines the shared public page structure.
- `PublicHeader` owns desktop and mobile navigation and marks the active route with `aria-current="page"`.
- `PublicFooter` contains institutional information and the LASCE Instagram link.
- `Brand` centralizes the institutional logo variants used by the header and footer.
- `app/lib/site.ts` defines the canonical site origin and public route list used by SEO metadata.
- `app/lib/work-areas.ts` defines the work area slugs, card content, and home section anchor.
- `app/robots.ts` and `app/sitemap.ts` generate `/robots.txt` and `/sitemap.xml`.

## Accessibility and SEO

The public layout includes keyboard-visible focus states, semantic landmarks, alternative text, an accessible mobile menu, and a **Saltar al contenido** link. Public pages expose indexable metadata and are included in the generated sitemap.

The automated accessibility suite uses `@axe-core/playwright` with WCAG A and AA rules. It also verifies keyboard navigation, the active navigation state, indexable metadata, `robots.txt`, and `sitemap.xml`.

## Automated Tests

Install the Playwright Chromium browser once after installing dependencies:

```powershell
Set-Location apps/web
.\node_modules\.bin\playwright.cmd install chromium
Set-Location ../..
```

Run the complete web test suite from the repository root:

```powershell
corepack pnpm --filter @lasce/web test
```

Run the tests with a visible browser when debugging:

```powershell
corepack pnpm --filter @lasce/web test:e2e:headed
```

The Playwright configuration starts the web development server automatically when one is not already running. The suite covers:

- Loading the landing page without authentication
- Direct access to all public routes, including the three work area pages
- Absence of redirects to login
- Desktop and mobile navigation
- Active links through `aria-current`
- Main-area cards and unknown-route `404` behavior
- Keyboard navigation and the skip link
- Automated WCAG A and AA checks
- Public indexing metadata, `robots.txt`, and `sitemap.xml`

## Quality Commands

Run these commands from the repository root before opening a Pull Request:

```powershell
corepack pnpm --filter @lasce/web lint
corepack pnpm --filter @lasce/web typecheck
corepack pnpm --filter @lasce/web test
corepack pnpm --filter @lasce/web build
```
