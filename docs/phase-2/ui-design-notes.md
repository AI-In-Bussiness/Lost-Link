# UI refinement — October 26, 2026

The direction is a school lost-and-found noticeboard: warm paper, dark green ink,
rust details, editorial headings and an original illustration of school belongings.
This is a design judgment tailored to LostLink, not a scientific test for whether
something looks AI-generated. The user endorsed this direction during implementation.

## Research and decisions

Sources read online on October 26, 2026:

- [NN/G: The Characteristics of Minimalism in Web Design](https://www.nngroup.com/articles/characteristics-minimalism/).
  Removing decoration should not remove information needed for a task. Keep
  visible school selection, form labels, ownership guidance and collection steps.
- [NN/G: Flat UI Elements Attract Less Attention and Cause Uncertainty](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/).
  Weak interaction cues make controls harder to locate. Keep filled primary
  actions, bordered inputs, underlined text links and visible keyboard focus.
- [NN/G: Top 10 Enduring Web-Design Mistakes](https://www.nngroup.com/articles/top-10-enduring/).
  Avoid difficult-to-scan presentation. Group filters separately from results,
  retain concise item facts and make the next action explicit.

Avoid interchangeable decorative cards, oversized rounded containers, stock
marketing slogans, decorative gradients and invented social proof. Those are
project-specific editorial choices, not findings established by these studies.
No statistics, testimonials, real item photographs or new capabilities were invented.

## Implementation

- Rebuilt the homepage illustration as an original inline SVG within a bordered
  noticeboard composition; it is illustrative and separate from actual inventory.
- Introduced a Georgia heading treatment, warm neutral surfaces, restrained rust
  details and smaller corner radii across the shared interface.
- Removed the enclosing homepage search card; school and description remain
  directly visible above the illustration on mobile.
- Added ruled numbered steps and a distinct school-office entry section.
- Widened the desktop filter column, emphasized its top edge and increased the
  photo disclosure text size. Retained result-card click targets and focus styles.
- Changed only shared presentation and homepage copy. The real API adapter,
  privacy boundaries, routes, data models and workflow event handlers are unchanged.

## Review

Visually inspected homepage at 1440 and 390px and search at 1440px. Existing
browser checks cover twelve routes at 320/768/1440px, keyboard workflows, text
resizing and reduced motion. All thirteen behavioral cases passed; the separately
run axe case also passed across twelve route/persona combinations.

No hosted deployment or independent phase approval is implied. The live adapter's
existing placeholder-photo limitation remains separate integration work. Real
inventory photography should replace placeholders when that work is completed.

## Paper-and-pen revision — October 26, 2026

The task owner found the first pass too similar to the original and supplied
[How to Stop AI-Generated UI Looking Templated](https://agent-design.com/blog/stop-ai-ui-looking-templated).
Its useful recommendations here are explicit typography/material constraints and
a short persistent design specification, rather than another palette-only pass.
See the new root DESIGN.md for the implemented system.

Revisited the original Founder A homepage at dc58f92. Its school selector, search,
claim guidance and staff entry remain. The revised design uses a tiled original
paper-grain SVG, locally hosted Caveat and Patrick Hand (SIL OFL licenses included),
ink rules, a notebook margin, a taped sketch and a two-column written checklist.
Body writing and form inputs remain upright; only decorative art is rotated.
Paper is a background, never an overlay that could obscure text or pointer targets.

Fonts come from google/fonts: ofl/caveat/Caveat[wght].ttf and
ofl/patrickhand/PatrickHand-Regular.ttf, downloaded October 26, 2026. Runtime assets
are same-origin. The local preview allowlists exactly the three design assets and
serves font bytes with font/ttf MIME; its private-file boundary stays intact.

This supersedes the first pass's Georgia/no-added-assets choices. Existing backend
contracts and real-photo integration boundaries are unchanged.
