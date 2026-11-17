# LostLink: pencil, paper and perspective

The task owner's November 2026 redesign keeps the school notebook identity while
adding the oversized typography, dimensional objects and motion of their visual
reference. This supersedes the earlier static, handwritten-only composition.

## Materials and typography

- Warm textured sand paper, deep olive ink and sparse signal-yellow highlights.
  Shared CSS tokens color every public, claimant, staff, account and admin view.
- Locally hosted Anton provides bold editorial headings. Caveat adds handwritten
  annotations; Patrick Hand provides readable writing and form inputs. Their OFL
  licenses ship alongside the fonts in `public/design/`.
- Paper texture stays behind content. Controls and data remain straight, with
  dark borders, explicit labels and visible keyboard focus.
- Primary buttons use yellow with ink text and a small offset ink shadow.
  Secondary actions use neutral paper; destructive and semantic status colors
  retain their meaning independently of the decorative palette.

## Composition

- The homepage is an editorial Lost/Found poster, with explicit school purpose,
  a layered original belongings sketch, a CSS 3D pencil and a paper luggage tag.
- The school selector and public-description search share a labeled search sheet.
  The feature and process sections use ruled layouts and numbered annotations.
- Search results use tactile paper cards; claim and staff screens use the same
  typography, rules, surfaces and controls. Tables remain horizontally scrollable.
- Native Next account, authentication, policy and administration routes use the
  shared `PaperFrame` shell and paper page/form classes.
- Layouts adapt from 320px phones through large screens, including enlarged text.

## Motion and accessibility

- Decorative paper objects float and turn using CSS perspective and transforms.
  A drawn flourish animates as pencil ink. Fine-pointer movement shifts depth
  layers without replacing the user's cursor or moving functional controls.
- IntersectionObserver progressively reveals homepage sections. Content remains
  visible without motion support, and keyboard focus reveals its entire section.
- The interface footer provides Pause/Resume animations, retained across its
  client-side navigation. OS reduced-motion requests override decorative motion.
  Native routes use only a short transform-based entry transition.
- No scroll locking, scroll hijacking, autoplay media or animation dependency.
  Functional headings retain full contrast throughout their entry motion.
- Motion listeners and observers are disposed when a view is replaced or unmounted.

## Product boundaries

- Keep the existing search-first school workflow, routes, API and role checks.
- Preserve public/private proof boundaries and staff ownership verification.
- Do not invent reviews, counts, testimonials or new product capabilities.
- Assets are local; no external runtime font or image services are required.
- Existing legal wording and brand/vector motifs remain intact.
- The redesign is delivered for PR review; merging and production publication
  require the task owner's subsequent decision.
