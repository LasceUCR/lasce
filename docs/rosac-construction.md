# ROSAC construction section

`/radioastronomia#construccion` presents all 15 supplied construction photographs between
activities (section 2) and radio observation (section 4). Researchers is section 5.

## Content

`apps/web/app/lib/rosac-construction.ts` centralizes introduction, stage descriptions, original
image paths and descriptive alternatives. The five stages contain 2, 2, 5, 1 and 5 photographs:

1. Estudios y fotogrametría
2. Preparación para el montaje
3. Montaje de la estructura
4. Donación de equipo EATON
5. Instalación eléctrica

The order is narrative, not a dated chronology. Preserve the array order, especially
`montaje_1` through `montaje_5`. Files remain under `apps/web/public/images/ROSAC/construction/`.
The user supplied 3:2 crops. Editorial copy remains provisional, pending LASCE validation and a
real PBI identifier.

## Interaction and accessibility

Semi-transparent arrow buttons on either side of the photo manually move through the selected
stage's images, looping at its boundaries. They have no visible text, but accessible labels,
44px targets and visible keyboard focus. The single-photo EATON stage hides these controls.
There is no autoplay, timer, animation or pause interaction.

The shared secondary buttons below the overview move between stages and reset the image to the
first photo. They are disabled at the first/last stage, centered with 32px spacing on desktop,
and stay in one row with 12px spacing on mobile. There are no stage tabs or visible photo counters.
A polite status region announces the stage and photo position after manual changes. Native buttons
support Tab, Shift+Tab, Enter and Space without moving focus when the image changes.

Next Image fills a stable 3:2 frame at every screen size. Below 1120px, the photo stacks above the
overview. No external dependency or lightbox is used.

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

Stories cover the default view, assembly, single-photo stage, second photo and mobile. Unit tests
cover all images, wrapping, stage boundaries, keyboard, announcements and absence of autoplay.
Browser checks cover image loading, stable 3:2 geometry, manual controls, keyboard, axe and overflow
at 1440, 768, 390 and 320px.

At 320px the existing shared header makes the document 327px wide even with this section hidden.
The carousel fits the viewport and does not increase that overflow. Fixing the header remains
outside this PBI. Automated accessibility checks do not replace assistive-technology user testing.
