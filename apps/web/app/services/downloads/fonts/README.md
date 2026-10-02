# Fonts for rasterized downloads

`Geist-Regular.ttf` is the font `exporters/png.ts` hands to resvg when it turns a chart SVG into a
PNG. The container image has no system fonts, so without a bundled file every label would render
blank. `next.config.ts` traces this folder into the standalone output.

Geist is © Vercel, released under the [SIL Open Font License 1.1](https://openfontlicense.org).
The file is the copy Next.js ships at `next/dist/compiled/@vercel/og/Geist-Regular.ttf`.
