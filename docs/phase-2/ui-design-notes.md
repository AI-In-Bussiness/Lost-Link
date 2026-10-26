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
