# Contact

How `/contacto` shows the official ways to reach LASCE. The page is public: it does not read a
session and it does not redirect to `/acceso`. The hero, the location section and the back link
come from the `contact` catalogue. Changing the planetarium location means editing
[`apps/web/app/lib/contact.ts`](../apps/web/app/lib/contact.ts) and deploying. The contact cards
are bilingual database content, edited in "Modo edición" by someone who holds
`create_components`, `edit_components` or `delete_components`. The map itself is the one
documented in [`rosac-location.md`](rosac-location.md).

The route used to be the placeholder served by `app/(public)/[section]/page.tsx` ("Contenido en
preparación"). That entry is gone. `/contacto` is now
[`app/(public)/contacto/page.tsx`](<../apps/web/app/(public)/contacto/page.tsx>). The dynamic
section route remains only for a work area that does not have its own page yet.

## The shape

```
/contacto                         page.tsx              article.topic-page
  ├─ TopicHero                    h1 "Contacto"
  ├─ TopicSection                 h2 "Ubicación"
  │    ├─ intro                   south side of the planetarium, readable if the map fails
  │    └─ RosacLocationMapLoader  satellite map, marker "LASCE"
  ├─ ContactChannelSection        h2 "Información de contacto"
  │    └─ CardGrid columns=3      InfoCard, or EditableWrapper while editing
  │         ├─ existing cards     icon, title, description
  │         └─ AddItemCard        only in edit mode, with create permission
  └─ .topic-page-footer           TopicBackLink "Volver al inicio"
```

| Piece           | File                                                     | Covered by                                           |
| --------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Page shell      | `app/lib/contact.ts`                                     | `app/lib/contact.test.ts`                            |
| Cards           | `app/lib/contact-channels.ts`, `contact-channel-schema`  | `contact-channels.test.ts`, `contact-channel-schema.test.ts` |
| Editor          | `ContactChannelForm.tsx`, `ContactChannelSection.tsx`    | `ContactChannelForm.test.tsx`, `ContactPage.test.tsx` |
| Location map    | `RosacLocationMapLoader`                                 | `ContactPage.test.tsx`, `tests/e2e/contacto.spec.ts` |
| Page            | `app/components/public/contact/ContactPage.tsx`          | `ContactPage.test.tsx`, `ContactPage.stories.tsx`    |
| Route           | `app/(public)/contacto/page.tsx`                         | `tests/e2e/contacto.spec.ts`                         |
| API             | `app/api/contacto/canales`                               | the route handlers                                   |
| Sitemap and SEO | `app/lib/site.ts` (`publicPaths`)                        | `tests/e2e/accessibility-seo.spec.ts`                |
| Header link     | `app/components/public/PublicHeader.tsx`                 | `tests/e2e/public-portal.spec.ts`                    |

`Contacto` is its own item in the header, after **Recursos**. The footer also links to `/contacto`.
The footer element itself uses `id="contacto"` on every page. The section on this page uses
`id="informacion-de-contacto"`, so the two ids do not collide.

## Cards

Each channel is an `InfoCard` inside `CardGrid` (`columns={3}`, `equalHeight`): icon tile, `h3`
title, description. The description is at most 120 characters. The field says so only when another character is typed past that limit, and that character is not added. The card shows at most three
lines, so one long text cannot stretch the row. A card whose title or description is blank or a
placeholder (`próximamente`,
`por definir`, `contenido en preparación`, `ejemplo`, `n/a`) is not rendered.

The icon is chosen first, then the title, then the description, in both languages, using
`LanguageTabs` and `TranslationReview`. The choices are phone, Instagram, email and Facebook. A location icon is not offered; the
laboratory's place is the map section. Instagram and Facebook may also store an `https` link;
the description then opens that link in a new tab. A phone card stores one number, the same in
both languages: eight local digits, or those digits with the 506 country code. That number
becomes `tel:+506` plus the local digits. An email description that contains `@` becomes
`mailto:`. Changing the icon away from Instagram or Facebook clears a stored link.

Spanish title and description live on `public.contact_channels`. English lives on
`public.contact_channel_translations`. The icon, the link and the position are shared. The
migration seeds the two cards the page already showed: phone `2511-6566` and Instagram
`@lasce_ucr` at `https://www.instagram.com/lasce_ucr/`.

The editor's own labels (the symbol names, the buttons, the toasts) follow the site language
and live in `contact.cards`. A save reports "Canal de contacto agregado / actualizado /
eliminado correctamente." A failure reports the server's reason, or "No se pudo guardar /
eliminar el canal de contacto. Inténtelo de nuevo." Field problems appear on the field and on
the language tab that holds them, the same way as the publication editor. Saving asks for no
second confirmation. Deleting asks first, through `EditableWrapper`. Closing a new card, or an
existing one with unsaved changes, asks first,
through `StandardConfirmDialog` with the warning severity, from Cancelar and from the modal's
close button and Escape
(`ContactChannelForm` exposes `requestCancel`; `AddItemCard` takes `onRequestClose`). In a
modal, the language tabs sit beside the title.

The installed `lucide-react` build does not export Instagram or Facebook icons, so those two
marks are drawn in `ContactChannelSection.tsx` with the same stroke weight as the Lucide phone,
map and mail icons.

## Location

The address is not a managed card. It is its own section, the same pattern as the ROSAC map
([`rosac-location.md`](rosac-location.md)): the address is a sentence above the map, and
`RosacLocationMapLoader` draws the satellite view. The sentence stays on the page when the
tiles fail. The map's accessible names follow the site language; ROSAC itself keeps the
Spanish defaults. A location icon on a card is a separate, optional channel and does not
replace this map.

The laboratory is on the south side of the Planetario de la Universidad de Costa Rica, in the
Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica. The Spanish
sentence is "se encuentra al costado sur del Planetario de la Universidad de Costa Rica,
Ciudad de la Investigación, San Pedro de Montes de Oca, San José, Costa Rica." The pin is the
marked point on that building's roof (9.936990, -84.045073). The map opens at zoom 18. It is a published map point, not a
surveyed GPS reading. The address does not include a postal code. The marker reads `LASCE`.

The footer still shows the shorter location "San Pedro de Montes de Oca". That line is the
footer identity, not this address. Changing one does not change the other.

The hero lead is "Canales oficiales del Laboratorio de Astrofísica Solar y Clima Espacial."
That name stays in Spanish in every language, including the meta description and the location intro.
