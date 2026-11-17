# Phase Report: 01 — Native page presentation

## Metadata
- **Agent:** codex-paper-account (Codex implementation sub-agent)
- **Founder version:** unassigned; no Founder version was supplied for this task.
- **Phase:** 01 — Native page presentation
- **Status:** Completed
- **Date (UTC):** 2026-11-17
- **Task / issue:** User-requested pencil-and-paper restyle across all pages, delivered for PR review.
- **Branch / commit:** codex/paper-motion, based on 51d3bef; root agent owns final commit/publication.

## Objective and scope
- **Goal:** Carry the shared paper design into native account, authentication, policy, administration and unavailable pages.
- **In scope:** A reusable server-rendered presentation shell, route wrappers, presentational form classes, and removal of conflicting button colors.
- **Out of scope:** Authentication, authorization, API handlers, database behavior, legal wording, shared CSS, and publication.

## Work performed
- Read AGENTS.md, README.md, DESIGN.md, coordination hub/current state/integration guidance, and installed Next.js layouts/pages and CSS guides before editing.
- Added `src/app/paper-frame.tsx` with the existing brand motif, shared header/navigation, skip link, and policy footer. Its optional owner flag preserves the website-owner administration link and sign-out form.
- Applied the shell and paper-page width variants to sign-in, sign-up, password recovery/reset, email confirmation recovery, account, both policy pages, owner administration, school administration and not-found screens, including native unavailable states.
- Applied paper-form and paper-input hooks while preserving form action/method, fields, constraints, status/error messages, redirects and server guards.
- **Files created or modified:** `src/app/paper-frame.tsx`; `src/app/{sign-in,sign-up,forgot-password,reset-password,resend-confirmation,account,admin,privacy,terms}/page.tsx`; `src/app/resend-confirmation/form.tsx`; `src/app/admin/admin-form.tsx`; `src/app/o/[orgSlug]/staff/settings/page.tsx`; `src/app/not-found.tsx`.
- **Decisions made:** Keep the root layout unchanged because the main DOM application already owns its own shell. Native route components wrap their existing main element, avoiding nested main landmarks. Legal text is untouched.

## Validation and results
- **Commands / checks run:** Focused `npx eslint` over all changed native pages and components passed. `npm run typecheck` passed. `git diff --check` passed. Read back diffs for preserved guards and form fields.
- **Tests not run:** Full production build and native-browser visual checks are owned by the root agent after the shared stylesheet is complete. No new tests were added for reversible markup-only changes.
- **Deliverables:** Native presentation markup in the listed paths and this report.

## Thoughts and reflections
- **What worked well:** A small server-only frame brought previously separate utility-styled routes into one visual system without altering request behavior.
- **What was difficult or surprising:** Administration already had a separate header; consolidation needed to preserve its immediate sign-out and owner navigation rather than simply removing them.
- **Trade-offs and alternatives considered:** A root-layout frame would have duplicated the DOM application's header. Explicit native wrappers keep those two rendering paths compatible.
- **What I would improve next:** Confirm visual spacing and long email/organization wrapping with the final CSS at narrow widths.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Root owns `.paper-page`, `.paper-page-body`, `.paper-page-narrow`, `.paper-page-account`, `.paper-page-wide`, `.paper-page-title`, `.paper-page-eyebrow`, `.paper-form`, `.paper-input`, and `.paper-access-list` CSS.
- **Dependencies / assumptions:** Shared interface CSS remains imported by the existing root layout; no external assets or inline styles were introduced.
- **Risks / integration concerns:** Owner headers contain more links than public headers and must wrap gracefully. Native route entry motion must honor reduced-motion preferences in CSS.
- **Questions / requested decisions:** Founder version remains unassigned; this does not block the user-authorized presentation implementation.

## Follow-up and handoff
- **Remaining work:** Root integrates shared CSS and performs final combined visual/build checks.
- **Recommended next steps:** Review sign-in/sign-up, policy pages, unavailable admin states and authenticated admin/settings at desktop and phone widths. Preserve the task owner's PR-only delivery restriction.
- **Relevant references:** AGENTS.md; DESIGN.md; docs/coordination/integration.md; parent assignment on codex/paper-motion.
