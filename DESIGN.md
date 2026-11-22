# LostLink UI and UX style guide

LostLink is a school lost-and-found. A visitor should be able to find their school, recognize an item and understand how to claim it. A staff member should be able to read evidence and record a return at a busy office desk. Use the notebook identity to make those tasks easier. Keep expressive lettering and perspective in the illustration; keep forms, records and navigation level.

## Palette and color balance

Use the 60/30/10 rule by visual weight across a page. Start with paper for about 60% of the composition. Olive and graphite supply about 30% through type, rules, navigation and illustration. Reserve the final 10% for pencil yellow on the principal action or one identifying detail. On a dense staff or policy page, keep yellow sparse. A warning or validation message takes its own semantic color.

| Role | CSS token and color | Use |
| --- | --- | --- |
| Canvas and sheets | `--paper` #F3EEDF, `--sheet` #FFFDF5, `--paper-edge` #E3DCC6 | Warm page canvas, opaque content and form surfaces, stacked paper edges |
| Structure | `--olive` #354331, `--ink` #252E23 | School strip, dark bands, headings, body text, line art |
| Supporting text and surfaces | `--muted` #555E4F, `--olive-soft` #E6EADC | Hints, metadata, private-information panels and positive status fills |
| Rules | `--rule` #C4C5B1, `--rule-strong` #727963 | Quiet dividers and cards, stronger outlines for editable controls |
| Emphasis | `--accent` #F1E461, `--accent-hover` #E8D94D | Primary button and marker stroke, paired with graphite text |
| Caution | `--caution` #715024 on `--caution-wash` #F7EED8 | Pending, reserved, and actions that need attention |
| Error or destructive action | `--danger` #863B32, `--danger-hover` #713027, `--danger-wash` #FAE9E1 | Validation text on paper, error summaries, rejected claims, destructive buttons |

Graphite on paper measures 12.1:1 contrast, muted text on paper 5.8:1, and sheet-colored text on dark olive 10.3:1. Graphite on yellow measures 10.7:1. Use the contextual `--focus` outline, which switches to yellow on the dark school strip, footer and staff callout. Aim for WCAG AA contrast of 4.5:1 for normal text and 3:1 for large text, control boundaries and focus indicators. Pair every state color with a word, icon with a text equivalent, or line treatment. Keep the paper texture transparent so the chosen surface color remains visible.

## Type, identity and layout

- Use local **Anton** at weight 400 for page titles, major section headings and dashboard counts. Use sentence case for task headings. The two-word homepage poster is the display exception.
- Use the shared sans-serif stack for instructions, legal text, labels, fields, buttons, tables and metadata. Use **Caveat** for short handwritten accents or item titles. **Patrick Hand** is available for short notebook annotations. Keep a long description, password or claim reference in a straightforward reading face.
- Give each page one informative `h1`. Put the school or workflow context in an existing `.eyebrow` when it helps orient the reader. Follow with the task or next step in plain language. Use real headings for sections and legends for grouped inputs.
- Use the canonical notebook mark in headers, footers and the favicon. The visible wordmark supplies the name beside a decorative logo image. Keep proportions and contrast when resizing. [Canonical artwork](src/app/icon.svg)
- Use the shared centered container for listings and workspaces, a narrow sheet for a single form and the reading column for policy text. Align the header and content gutters. Space related controls by 8–12px, related groups by 16–24px and major groups by at least 32px. Start with the existing 320–1440px layouts and let longer labels wrap.
- Keep the same wordmark, type, colors and controls on phones. Put the wordmark and account action above a visible, wrapping navigation row. Keep the school name and change-school link beside each other so the current context stays clear. Stack the footer groups when their links need the full width.
- Use a single 1px rule and the shared 4px radius and paper shadow for functional sheets. A transparent paper grain belongs on the background. Use the stronger offset ink shadow on buttons. Save rotation, tape and projected shadows for illustration.

## Component rules

| Component | Implementation and behavior |
| --- | --- |
| Page shell and navigation | Mounted screens use the shared app shell. Native screens use `PaperFrame` and a `main#main` landmark. Keep a keyboard skip link, a named navigation region, an identifiable current route and a footer with the motion control. Preserve school and account context. |
| Heading and body | Use `.page-heading`, a plain `h1` and optional context or supporting text. Use `.stack`, `.two-column` or `.actions` for grouping. Put reading order and keyboard order in the markup. |
| Buttons and links | Use a button for an action and a link for navigation. Use a yellow `.button` for the principal action in a group, `.secondary` for a paper alternative, and an underlined link or `.plain` for a lower-priority action. Use `.danger` for destructive actions and name the object in the label. Preserve a visible focus ring and aim for 44px hit areas on standalone controls. |
| Forms | Use `.field`, a visible label and a native input, select or textarea. Associate help with `aria-describedby`. Keep placeholders supplementary. For a group, use `fieldset` and `legend`. Place actions after the fields in keyboard order. |
| Busy, invalid and successful submissions | Give a busy form a status or busy indication and prevent duplicate submits. Keep values when a retry is possible. Mark invalid fields with `aria-invalid="true"` and a linked error message. Use `.error-summary` for multiple errors, focus it on submit, and link to the fields. Announce completion in a status region and show the next action. |
| Cards, lists and photos | Use `.card` for sections and `.item-card` for a search result. Group the image, item title, public location/date and action. In a single-column item detail, show the title and description before the image. Give photographs descriptive alt text. Mark a placeholder as an illustration. A second action such as staff photo review must remain independently focusable and clickable above the stretched item link. |
| Filters, results and pagination | Keep filters labeled and group them ahead of results on phones. Pair category with color and the two dates when both fields fit. Align a status selector and its Apply filter button along the bottom when they share a row. Preserve the query, filters and school through paging. State what was matched and whether results are limited. Use `.empty-state` with a relevant recovery action for empty, unavailable or failed results. |
| Tables and disclosure | Use a real table with a caption and column headers. Place a wide operational table inside a labeled, focusable `.table-wrap`. It scrolls horizontally at small widths while headers and action words stay readable. Use native `details` and `summary` for disclosures and give the summary a clear action target. |
| Badges and notices | Display the actual status in the badge text. Use neutral paper for inactive or informational states, sage for available or approved, ochre for waiting, brick for rejection, and olive for completed returns. Use `.notice`, `.warning`, `.privacy` and `.error-summary` according to meaning. |
| Claims, staff and owner screens | Group public listing details and private evidence under separate visible headings. Use a `.privacy` panel for staff-only details. Keep role guards and server-side visibility rules when changing layout. State which action records an approval, physical handover or other status change. |

## Motion and stacking

| Treatment | Token or implementation | Intended effect |
| --- | --- | --- |
| Control feedback | `--motion-fast` 140ms | A small underline, press or hover lift. Keep labels and hit areas steady. |
| Card feedback | `--motion-standard` 220ms | A subtle lift with the existing border or shadow. Keyboard focus remains independently visible. |
| Page and section entry | `--motion-enter` 340ms, `--ease-paper` | One short vertical translation, with text readable from the first frame. Use `data-reveal` only where a section benefits. |
| Illustration | CSS transform keyframes; fine-pointer tilt on independent translate/rotate properties | Use ease-in-out for the slow paper, pencil and tag loops. Pause them when the figure scrolls offscreen. Define a complete resting pose. Keep decorative motion within its own figure. |

Use the shared motion binder in both shells. It honors the OS preference, keeps a manual pause for the browser tab through navigation and reload, and cleans up observers and listeners when a view changes. If storage is restricted, the current document still supports pause. Render the page and its controls in their final readable state before enhancement. Keep a focused field or anchor visible immediately.

The hero figure owns an isolated stacking context. Its drawing mat sits at 0, orbit and flourish at 1, sheet at 2, pencil at 3, tag at 4 and captions at 5. On narrower screens, the drawing mat, sheet, pencil and tag scale with the available width inside `.scene-stage`. The figure heading and caption get their own rows. Keep the drawing flat on the sheet. Only the pencil needs a local 3D context and separated faces. The shaft and wood tip share one length token so their front faces meet along an edge. A filter on that context can flatten its children. Animate transforms and keep animated position, size and margin changes out of the layout. Test the full sweep with the pointer on both sides and check clearance above the caption and below the heading. For cards, keep the stretched link and secondary action local to the card. The skip link must stay reachable above the page.

## Applying a change

1. Find the shared component or class before adding a page-specific rule. Color, spacing and timing tokens live at the top of the shared stylesheet. Both renderers consume it. [Styles](src/interface/styles.css) · [Mounted shell](src/interface/app.ts) · [Native shell](src/app/paper-frame.tsx) · [Motion](src/interface/motion.ts)
2. Reuse a semantic control and its existing task label. Introduce a token or component only when its role differs from an existing one. Record that role here when changing the system.
3. Check a public route, a signed-in workflow and a native page affected by the change. Inspect phone, tablet and desktop layouts, enlarged text, keyboard focus, normal and reduced motion, and the busy, empty or error state the component can reach.
4. Run lint, both TypeScript checks and the interface format check. The browser suite exercises keyboard flows, accessibility, animation geometry, responsive tables and status changes. For changes to native routes, verify the production build as well. [Browser tests](tools/phase2-browser-test.py) · [Development and production checks](DEVELOPMENT.md)
