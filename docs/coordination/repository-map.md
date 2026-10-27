# Repository map and work routing

Existing file paths are preserved on the integrated main baseline. Read
[current state](current-state.md) for delivered behavior and remaining work.

| Location | Purpose | Suggested coordinating role |
| --- | --- | --- |
| README.md, AGENTS.md, LICENSE | Project entry, agent rules, licensing | Task owner / repository integrator |
| docs/coordination/ | Shared navigation, state, integration dependencies | Agent making the affected shared change |
| docs/phase-0/ | Product scope, UX, competition, proposals | Founder A; Founder B for architecture |
| docs/phase-1/ | Mock guide and backend foundation handoffs | Relevant founder |
| src/mocks/ | Fictional fixtures, proposed LostLinkApi, behavior tests | Founder A; coordinate contract changes with B |
| public/mock-assets/ | Development placeholder illustration | Founder A |
| src/interface/, tools/phase2-* | Live DOM interface, standalone preview and browser checks | Founder A |
| src/app/, src/lib/, src/proxy.ts | Next.js routes, API validation, auth/session and photos | Founder B / integrator |
| supabase/ | Migrations, seed and SQL permission/state tests | Founder B |
| scripts/, tests/, .github/workflows/ | Runtime helpers, unit/integration checks and CI | Founder B / integrator |
| agent-logs/ | Per-agent, per-phase reports | Each agent owns its own reports |
| plan.md, competition_rules.pptx | Original project references | Preserve; cite original and derived interpretation |

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
