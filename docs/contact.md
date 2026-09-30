# Contact

How `/contacto` shows the official ways to reach LASCE. The page is public: it does not read a
session and it does not redirect to `/acceso`. The copy is static. Nothing here is read from
PostgreSQL. Changing a phone number, an address line or the Instagram handle means editing
[`apps/web/app/lib/contact.ts`](../apps/web/app/lib/contact.ts) and deploying.

The route used to be the placeholder served by `app/(public)/[section]/page.tsx` ("Contenido en
preparación"). That entry is gone. `/contacto` is now
[`app/(public)/contacto/page.tsx`](../apps/web/app/(public)/contacto/page.tsx). The dynamic
section route remains only for a work area that does not have its own page yet.

## The shape

```
/contacto                         page.tsx              article.topic-page
  ├─ TopicHero                    h1 "Contacto"
  ├─ TopicSection                 h2 "Información de contacto"
  │    └─ CardGrid columns=3      equal height, same grid as other InfoCards
  │         ├─ InfoCard Teléfono  Phone icon, tel link
  │         ├─ InfoCard Ubicación MapPin icon, two address lines
  │         └─ InfoCard Instagram ExternalLink icon, profile in a new tab
  └─ .topic-page-footer           TopicBackLink "Volver al inicio"
```

| Piece            | File                                            | Covered by                                      |
| ---------------- | ----------------------------------------------- | ----------------------------------------------- |
| Channels         | `app/lib/contact.ts`                            | `app/lib/contact.test.ts`                       |
| Page             | `app/components/public/contact/ContactPage.tsx` | `ContactPage.test.tsx`, `ContactPage.stories.tsx` |
| Route            | `app/(public)/contacto/page.tsx`                | `tests/e2e/contacto.spec.ts`                    |
| Sitemap and SEO  | `app/lib/site.ts` (`publicPaths`)               | `tests/e2e/accessibility-seo.spec.ts`           |
| Header link      | `app/components/public/PublicHeader.tsx`        | `tests/e2e/public-portal.spec.ts`               |

`Contacto` is its own item in the header, after **Recursos**. The footer also links to `/contacto`.
The footer element itself uses `id="contacto"` on every page. The section on this page uses
`id="informacion-de-contacto"`, so the two ids do not collide.

## What is shown

Only complete, approved values. `availableContactChannels` drops a channel whose text is blank or
a placeholder (`próximamente`, `por definir`, `contenido en preparación`, `ejemplo`, `n/a`, and
the same for an empty `tel:`, `mailto:` or `#` link). The page does not render an empty card and
does not say that a missing channel is coming later.

| Channel    | Visible text                                              | Link                                      |
| ---------- | --------------------------------------------------------- | ----------------------------------------- |
| Teléfono   | `2511-6566`                                               | `tel:+50625116566`                        |
| Ubicación  | Sede Rodrigo Facio, then Montes de Oca, San José          | none                                      |
| Instagram  | `@lasce_ucr`                                              | the Instagram URL already in `footer.ts`  |

The phone is the Costa Rica local form. The `tel:` link includes the country code `+506`. The
address is two lines and does not include a postal code. Instagram opens in a new tab with
`rel="noreferrer"`. Its `href` is the footer link labelled `Instagram`, so the profile URL has
one source. If that footer link is removed, the Instagram card disappears with it.

The hero lead is "Canales oficiales del Laboratorio de Astrofísica Solar y Clima Espacial." The
footer still shows the shorter location "San Pedro de Montes de Oca". That line is the footer
identity, not this address. Changing one does not change the other.

## Cards

Each channel is an `InfoCard` inside `CardGrid` (`columns={3}`, `equalHeight`), the same card the
academic-activity page uses for type, date and place: icon tile, `h3` title, 14px description.
The phone and the Instagram handle are links inside that description. A string description stays
one paragraph. A channel with `lines` renders one paragraph per line, which is how the address
keeps its two rows.

The installed `lucide-react` build does not export an Instagram icon. The card uses `ExternalLink`.
Importing `Instagram` from that package fails the page at compile time.

## Adding a channel

Append an entry to `contactContent.channels` in `app/lib/contact.ts`:

- `id`: unique. `phone`, `location` and `instagram` also pick the icon. Any other id renders the
  card without one.
- `label`: the card title, in Spanish.
- `value`: the single visible line. Use `lines` instead when the text is an address.
- `href`: optional. `tel:` stays in the same tab. Set `external: true` for a site that should
  open in a new tab.

Leave the field out until LASCE has approved a real value. A blank or placeholder entry is
filtered out, but it should not be committed as if it were official information.
