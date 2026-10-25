# Repository map and work routing

Existing file paths are preserved. Entries marked branch-only must be read at
the commits linked in [current state](current-state.md), until merged.

| Location | Purpose | Suggested coordinating role |
| --- | --- | --- |
| README.md, AGENTS.md, LICENSE | Project entry, agent rules, licensing | Task owner / repository integrator |
| docs/coordination/ | Shared navigation, state, integration dependencies | Agent making the affected shared change |
| docs/phase-0/ | Product scope, UX, competition, proposals | Founder A; Founder B for architecture on its branch |
| docs/phase-1/ | Mock guide and handoff; backend foundation docs branch-only | Relevant founder |
| src/mocks/ | Fictional fixtures, proposed LostLinkApi, behavior tests | Founder A; coordinate contract changes with B |
| public/mock-assets/ | Development placeholder illustration | Founder A |
| src/interface/, tools/phase2-* | Branch-only DOM interface, preview and browser checks | Founder A |
| src/app/, src/lib/, src/proxy.ts | Branch-only Next.js routes, API validation, auth/session | Founder B / integrator |
| supabase/ | Branch-only migrations, seed and SQL permission/state tests | Founder B |
| scripts/, tests/, .github/workflows/ | Branch-only runtime helpers, unit/integration checks and CI | Founder B / integrator |
| agent-logs/ | Per-agent, per-phase reports | Each agent owns its own reports |
| plan.pdf, competition_rules.pptx | Original project references | Preserve; cite original and derived interpretation |

Role labels describe existing handoffs and suggested review routing, not exclusive
write permissions or new assignments. Coordinate overlap through the shared board.

## Placement conventions

- Put shared current guidance in docs/coordination/ and link to phase originals.
- Keep new phase-specific design and validation beside that phase's existing docs.
- Keep the existing mock package, runtime routes, migrations, and tests in their
  current trees. Do not create another root app or manifest during organization.
- Keep per-agent reports in the exact AGENTS.md naming scheme.
- Avoid duplicate contracts. Link the mock proposal and backend implementation
  separately until reconciliation has an explicit decision and reviewer.
- If a later task moves a file, record old and new paths and update every
  reference in that same change. Do not silently discard superseded work.
