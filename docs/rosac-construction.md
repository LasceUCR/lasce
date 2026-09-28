# ROSAC construction section

`/radioastronomia#construccion` presents the ROSAC construction photographs between activities
(section 3) and radio observation (section 5). Researchers is section 6. A "Ubicación" section
with a map (section 2) sits before activities -- see docs/rosac-location.md.

## Content

`apps/web/app/lib/rosac-construction.ts` centralizes introduction, stage descriptions, original
image paths and descriptive alternatives. The five stages follow the process order required by
the "ROSAC Construction Process" PBI, and contain 5, 5, 5, 3 and 5 photographs:

1. Preparación para el montaje
2. Montaje de la estructura
3. Montaje de paneles
4. Fotogrametría y nivelación de paneles
5. Instalación eléctrica

This replaces an earlier, narrative ordering that led with an initial "Estudios y fotogrametría"
stage and included a sixth "Donación de equipo EATON" stage. That EATON stage has been dropped
entirely (not folded into another stage) -- it is not one of the PBI's five required stages, and
its photo (`EATON_1.jpeg`) is no longer referenced from any stage.

The former single "Montaje de la estructura" stage was split into "Montaje de la estructura" and
"Montaje de paneles" from photo alt text alone at first (`montaje_5` explicitly shows "un panel
suspendido"); that split is now confirmed by the supplied photos themselves, sourced and sorted
into per-stage folders on disk. The photogrammetry stage stayed positioned after panel assembly,
with its copy reframed as a post-assembly verification step rather than the initial site survey it
described before -- the added `Fotogrametria_3` photo, showing two people measuring directly on
the already-assembled reflector surface, supports that reframing. This remains this PBI's own
reading of the supplied photos, not a confirmed account: like the rest of this section's editorial
copy, it stays provisional pending LASCE validation.

Each stage's photos now live in their own subfolder under
`apps/web/public/images/ROSAC/construction/` (`Preparacion Montaje`, `Montaje`, `Montaje Paneles`,
`Fotogrametria`, `Intalacion Electrica` -- folder names exactly as created, spaces and all, not
translated or corrected), rather than one flat directory. `rosac-construction.ts` percent-encodes
the spaces in those folder names (`%20`) in every `src`, since a literal space in a URL is best
avoided even where a browser would tolerate it. A handful of old files were left unreferenced
after this reorganization -- `EATON_1.jpeg`, and same-photo duplicates saved under a second
extension (`prev_montaje_1.jpeg` next to the `.jpg` used, `prev_montaje_2.png` next to the `.jpg`
used, `montaje_4.jpeg` next to the `.jpg` used in "Montaje Paneles") -- confirmed as pixel-identical
duplicates, not distinct photos, before being left out. None of these were deleted from the repo.
The user supplied 3:2 crops.

## Interaction and accessibility

Semi-transparent arrow buttons on either side of the photo manually move through the selected
stage's images, looping at its boundaries. They have no visible text, but accessible labels,
44px targets and visible keyboard focus. A stage with only one photo hides these controls --
none of the five ROSAC stages currently has just one photo, but `Carousel` still supports it and
`Carousel.test.tsx`/`Carousel.stories.tsx` exercise it with a small synthetic fixture rather than
relying on real content happening to have a single-photo stage. There is no autoplay, timer,
animation or pause interaction.

The shared secondary buttons below the overview move between stages and reset the image to the
first photo. They are disabled at the first/last stage, centered with 32px spacing on desktop,
and stay in one row with 12px spacing on mobile. There are no stage tabs or visible photo counters
-- position is announced to assistive technology only (see below), a deliberate choice kept for
this PBI. A polite status region announces the stage and photo position after manual changes.
Native buttons support Tab, Shift+Tab, Enter and Space without moving focus when the image changes.

Next Image fills a stable 3:2 frame at every screen size. Below 1120px, the photo stacks above the
overview. No external dependency or lightbox is used.

## A photo that fails to load

`Carousel` tracks failed image `src`s in its own state. When the currently shown photo's `src` is
in that set, it renders a text placeholder (an `ImageOff` icon plus a message, in a `role="status"`
region) in place of the `<Image>`, inside the same 3:2 frame -- geometry does not jump. The photo
previous/next controls, the stage title and description, and the secondary stage controls are
unaffected: a broken photo does not block navigating to another photo in the same stage or to a
different stage. A `src` that has failed once keeps showing the placeholder for the rest of the
session; there is no retry.

## Reuse

The carousel mechanics -- primary photo with looping overlay controls, secondary panel with
group navigation, live-region announcement, no autoplay -- live in the shared
`apps/web/app/components/public/Carousel.tsx`, not in this section's own component. Group and
photo copy (the "Etapa"/"Fotografía" nouns and the four button labels) are props with defaults
that match what this page has always shown, so a future carousel can override them instead of
forking the component.

`apps/web/app/components/public/rosac/ConstructionCarousel.tsx` is now a thin wrapper: it points
`Carousel` at `rosacConstructionContent.stages` and supplies this page's accessible name. Its own
tests only check that the wiring is correct; the interaction itself is covered once, on `Carousel`,
in `Carousel.test.tsx`.

## Verification

Stories cover the default view, assembly, single-photo stage (synthetic fixture), second photo and
mobile. Unit tests cover all images, wrapping, stage boundaries, keyboard, announcements, absence
of autoplay, and the failed-image placeholder (`Carousel.test.tsx`). The failed-image test relies
on the shared `next/image` mock in `apps/web/vitest.setup.ts` forwarding `onError`, so it can fire
a real error event on the rendered `<img>`. Browser checks cover image loading, stable 3:2 geometry,
manual controls, keyboard, a blocked-image fallback, axe and overflow at 1440, 768, 390 and 320px.

At 320px the existing shared header makes the document 327px wide even with this section hidden.
The carousel fits the viewport and does not increase that overflow. Fixing the header remains
outside this PBI. Automated accessibility checks do not replace assistive-technology user testing.
