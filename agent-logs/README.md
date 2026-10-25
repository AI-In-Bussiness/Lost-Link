# Agent reports

Every agent creates its own folder and Markdown report after each phase.
Use the exact format and complete template in [AGENTS.md](../AGENTS.md).

```text
agent-logs/
  <agent_id>__founder-v<founder_version>__phase-<phase_number>-<phase_slug>/
    <agent_id>__founder-v<founder_version>__phase-<phase_number>-<phase_slug>.md
```

Use the assigned Founder version. If none is supplied, use `unassigned` and
record the missing assignment as an open question. Never edit another agent's
report to claim new review results.

Reports on unmerged branches remain there; the
[current-state snapshot](../docs/coordination/current-state.md) links their
delivery branches and the [documentation index](../docs/README.md) links the
handoffs. Do not copy reports into main as if their implementation were merged.

## Organization reports

- [Repository coordination pass](codex-repo-organizer__founder-vunassigned__phase-00-repository-organization/codex-repo-organizer__founder-vunassigned__phase-00-repository-organization.md)

Add links for future reports when useful. A report records scoped completion;
shared phase acceptance still requires its review evidence.
