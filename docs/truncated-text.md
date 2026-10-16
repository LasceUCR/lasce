# Truncating long text ("Leer más")

How to cut a long piece of text after a number of lines, with a "Leer más" / "Leer menos" toggle
that shows the whole text in place. Use the shared `TruncatedText` component
(`apps/web/app/components/public/TruncatedText.tsx`) for this rather than a CSS `line-clamp` of
your own: it measures whether the text really overflows, keeps the toggle accessible and follows
the site's language.

The research area cards on `/investigacion` are the working example (`ResearchAreaCard.tsx`).

## Quick start

```tsx
import { TruncatedText } from '@/app/components/public/TruncatedText'

;<TruncatedText lines={3}>{area.description}</TruncatedText>
```

That is all a field needs. The text shows its first three lines; if it does not fit, the last line
ends in "… **Leer más**", inline, like a link at the end of the text. Pressing it shows the whole
text in place, followed by "**Leer menos**" right after the last word, which cuts it again.

## Props

| Prop            | Type                         | Default                    | What it does                                                                             |
| --------------- | ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `children`      | `string`                     | required                   | The text. Plain text only (see [Limitations](#limitations)).                             |
| `lines`         | `number`                     | required                   | How many lines show before the text is cut.                                              |
| `as`            | `'p'` \| `'div'` \| `'span'` | `'p'`                      | The element that holds the text.                                                         |
| `className`     | `string`                     | none                       | Classes for the text (font, colour, margins). The clamp itself comes from the component. |
| `lang`          | `string`                     | none                       | The text's language when it can differ from the page's, such as database content.        |
| `readMoreLabel` | `string`                     | "Leer más" / "Read more"   | The toggle's label while the text is cut.                                                |
| `readLessLabel` | `string`                     | "Leer menos" / "Read less" | The toggle's label while the text is whole.                                              |

## How it behaves

- **Only when needed.** A `ResizeObserver` compares the text's full height with its clamped box, at
  whatever width it gets. Text that fits in `lines` is shown exactly as it was, with no toggle, and
  a text that starts to overflow when the window narrows gets one.
- **Inline toggle.** Collapsed, the toggle sits at the end of the last visible line after an
  ellipsis, and the text wraps around it; expanded, it follows the last word. It never adds a line
  of its own.
- **Expanding in place.** "Leer más" removes the clamp; nothing navigates or opens. The container
  grows to fit, so put it in a layout that can grow (a flex column or a normal block), not in a box
  with a fixed height.
- **The whole text is always in the page.** The clamp is visual only, so search, copying and
  assistive technology read all of it.
- **Accessible toggle.** It is a real `<button>` with `aria-expanded` and `aria-controls` pointing at
  the text, reachable with the keyboard, with a visible focus ring. Its chevron icon is decorative.
- **Language.** The default labels come from `common.truncatedText` in `apps/web/messages/`, so they
  follow the language chosen in the header. `lang` marks the text only; the toggle keeps the page's
  language.

## Recipes

### A field that is database content

Database content can be in a different language from the page, or in an unknown one for a record
saved before translations existed. Pass its language through `contentLangAttribute`, as the
research area card does:

```tsx
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'

;<TruncatedText
  className="my-card-description"
  lang={contentLangAttribute(record.contentLocale)}
  lines={3}
>
  {record.description}
  className="research-area-card-description"
  lang={contentLangAttribute(area.contentLocale)}
  lines={3}
>
  {area.description}
</TruncatedText>
```

See [`translate-database-content.md`](translate-database-content.md) for where `contentLocale` comes
from.

### Labels of your own

When "Leer más" does not say enough, name what is shown. Put the wording in the message catalogue,
in both languages, and pass it in:

```tsx
const t = useTranslations('publications.card')

;<TruncatedText lines={2} readLessLabel={t('readLess')} readMoreLabel={t('readMore')}>
  {publication.abstract}
</TruncatedText>
```

### Styling the text

`className` styles the text element (`as`); keep layout properties out of it. The component owns
the layout (`.truncated-text*` in `globals.css`): the element is a flex box, and the text inside it
is cut to `lines` lines of height (`--truncated-lines`, with the line height it measures) while an
empty float pushes the toggle onto the last visible line. A class of yours only needs the look:

```css
.academic-activity-card-description {
  margin: 10px 0 0;
.research-area-card-description {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
```

The toggle is styled by `.truncated-text-toggle`: a text link inside the text, so it reads as part of
it and does not compete with a card's own actions. It takes the text's font size.

## Testing

jsdom lays nothing out, so a component test has to say whether the text overflows. Stub
`ResizeObserver` and the two heights it compares, then assert what the visitor gets:

```tsx
vi.stubGlobal(
  'ResizeObserver',
  class {
    constructor(private readonly callback: () => void) {}
    observe() {
      this.callback()
    }
    disconnect() {}
  },
)
vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120)
vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(60)

renderWithIntl(<TruncatedText lines={3}>{longText}</TruncatedText>)

await user.click(screen.getByRole('button', { name: 'Leer más' }))
expect(screen.getByRole('button', { name: 'Leer menos' })).toHaveAttribute('aria-expanded', 'true')
```

- Render with `renderWithIntl`, since the default labels come from the catalogue.
- To check the cut, read `element.style.getPropertyValue('--truncated-lines')` on the element
  `getByText` returns for the text: `'3'` while cut,
  `''` while whole. The toggle is inside that element (`expect(text).toContainElement(toggle)`);
  the `id`, `lang` and classes are on its parent, the element `as` names.
- Restore the stubs afterwards (`vi.unstubAllGlobals()`, `vi.restoreAllMocks()`).
- A real overflow, at a real width, belongs in a Playwright spec: see the "Leer más" test in
  `apps/web/tests/e2e/public-portal.spec.ts`.

`TruncatedText.test.tsx` and `AcademicActivityCard.test.tsx` show both.
  `apps/web/tests/e2e/research-areas-i18n.spec.ts`.

`TruncatedText.test.tsx` and `ResearchAreaCard.test.tsx` show both.

## Limitations

- **Plain text only.** `children` is a string. Rich text (links, emphasis, paragraphs) is not
  supported; line clamping across several paragraphs would need a different design.
- **Needs `ResizeObserver` for the toggle.** Every browser the site supports has it; where it is
  missing, the text is still clamped but no toggle appears, so the rest cannot be shown there.
- **One toggle per text.** It expands that text only; there is no "expand all".
